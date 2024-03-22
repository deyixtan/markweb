import fs from "fs/promises";
import handlebars from "handlebars";
import hljs from "highlight.js";
import DOMPurify from "isomorphic-dompurify";
import beautify from "js-beautify";
import { Marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { markedHighlight } from "marked-highlight";
// @ts-expect-error package without typings
import markdownToc from "markdown-toc";
import path from "path";
import {
  isDirectory,
  getFiles,
  getFilteredFilesRecurively,
  renameFile,
  readFileContent,
  writeFileContent,
} from "./file-manager";
import config from "../config";

interface MarkdownObject {
  title: string;
  navigation: string;
  content: string;
  toc: string;
  link: string;
}

const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang, _) {
      if (lang === "mermaid") {
        return `<div class="mermaid">${code}</div>`;
      } else {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, { language }).value;
      }
    },
  }),
);
marked.use({ gfm: true });
marked.use(gfmHeadingId());

export async function processOutputDir(
  outputDirPath: string,
  templateFilePath: string,
  linkPrefix: string,
): Promise<void> {
  const navigationContent = await generateNavigation(outputDirPath, linkPrefix);
  await processMarkdownFiles(outputDirPath, templateFilePath, linkPrefix, navigationContent);
}

async function generateNavigation(rootDirPath: string, linkPrefix: string, indentLevel: number = 0): Promise<string> {
  let content = "";

  const processDirectory = async (dirPath: string, indentLevel: number): Promise<void> => {
    const fileNames = await getFiles(dirPath);
    for (const fileName of fileNames) {
      const indent = "  ".repeat(indentLevel);
      const filePath = path.join(dirPath, fileName);

      // process sub-directories
      if (await isDirectory(filePath)) {
        const linkText = fileName;
        const linkPath = "#";

        // ignore hidden directories
        if (linkText.startsWith(".")) continue;

        content += `${indent}* [${linkText}](${linkPath})\n`;
        await processDirectory(filePath, indentLevel + 1);
        continue;
      }

      // process files (only markdown)
      if (!fileName.endsWith(".md")) continue;

      const linkText = fileName.slice(0, -3); // trim extension
      const linkPath = (linkPrefix ? path.join("/", linkPrefix, filePath.replace(rootDirPath, "")) : filePath).replace(
        ".md",
        ".html",
      );
      content += `${indent}* [${linkText}](${linkPath})\n`;
    }
  };

  await processDirectory(rootDirPath, indentLevel);
  return content;
}

async function processMarkdownFiles(
  outputDirPath: string,
  templateFilePath: string,
  linkPrefix: string,
  navigationContent: string,
): Promise<void> {
  const markdownFiles = await getFilteredFilesRecurively(outputDirPath, ".md");

  const fuseList: object[] = [];
  const processingFiles = markdownFiles.map(async (markdownFile): Promise<void> => {
    const markdownObject = await prepareMarkdownObject(
      markdownFile.name,
      markdownFile.path,
      outputDirPath,
      navigationContent,
    );
    await processMarkdownFile(markdownFile.name, markdownFile.path, markdownObject, templateFilePath, linkPrefix);
    fuseList.push(markdownObject);
  });

  await Promise.all(processingFiles);
  await fs.writeFile(path.join(outputDirPath, config.SEARCH_DB_FILE_NAME), JSON.stringify(fuseList));
}

async function prepareMarkdownObject(
  fileName: string,
  fileDirPath: string,
  outputDirPath: string,
  navigationContent: string,
): Promise<MarkdownObject> {
  const title = fileName.replace(".md", "");
  const navigation = navigationContent;
  const content = await readFileContent(path.join(fileDirPath, fileName));
  const toc = markdownToc(content).content;
  const link = path.join("/", path.relative(outputDirPath, fileDirPath), fileName.replace(".md", ".html"));
  return { title, navigation, toc, content, link };
}

async function processMarkdownFile(
  fileName: string,
  fileDirPath: string,
  markdownObject: MarkdownObject,
  templateFilePath: string,
  linkPrefix: string,
) {
  const newFileName = fileName.replace(".md", ".html");
  const oldPath = path.join(fileDirPath, fileName);
  const newPath = path.join(fileDirPath, newFileName);

  const navContent = await marked.parse(markdownObject.navigation);
  const purifiedNavContent = DOMPurify.sanitize(navContent);

  const htmlContent = await marked.parse(markdownObject.content);
  const purifiedHtmlContent = DOMPurify.sanitize(htmlContent);

  const htmlToc = await marked.parse(markdownObject.toc);
  const purifiedHtmlToc = DOMPurify.sanitize(htmlToc);

  const templateContent = await readFileContent(templateFilePath);
  const compiledTemplate = handlebars.compile(templateContent);
  const populatedContent = compiledTemplate({
    title: markdownObject.title,
    navigation: purifiedNavContent,
    toc: purifiedHtmlToc,
    content: purifiedHtmlContent,
    link_prefix: linkPrefix,
  });
  const formattedContent = beautify.html(populatedContent, { indent_size: 2 });

  await renameFile(oldPath, newPath);
  await writeFileContent(newPath, formattedContent);
}
