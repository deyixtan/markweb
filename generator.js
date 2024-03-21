import fs from "fs/promises";
import handlebars from "handlebars";
import hljs from "highlight.js";
import DOMPurify from "isomorphic-dompurify";
import beautify from "js-beautify";
import { Marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { markedHighlight } from "marked-highlight";
import markdownToc from "markdown-toc";
import path from "path";

const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang, info) {
      if (lang === "mermaid") {
        return `<div class="mermaid">${code}</div>`;
      } else {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, { language }).value;
      }
    },
  })
);
marked.use({ gfm: true });
marked.use(gfmHeadingId());

export default async function generateStaticSite(
  inputDirPath,
  outputDirPath,
  templateFilePath,
  base_dir
) {
  await prepareOutputDirectory(inputDirPath, outputDirPath);
  await processMarkdownFiles(outputDirPath, templateFilePath, base_dir);
}

async function prepareOutputDirectory(inputDirPath, outputDirPath) {
  await fs.rm(outputDirPath, { recursive: true, force: true });
  await fs.mkdir(outputDirPath, { recursive: true });
  await fs.cp(inputDirPath, outputDirPath, { recursive: true });
}

async function processMarkdownFiles(outputDirPath, templateFilePath, base_dir) {
  const fuseList = [];
  const navigationContent = await generateNavigation(outputDirPath, base_dir);
  const markdownFiles = await findMarkdownFiles(outputDirPath);
  const promises = markdownFiles.map(async (markdownFile) => {
    const mdObject = await prepareMarkdownObject(
      outputDirPath,
      markdownFile,
      navigationContent
    );
    if (!mdObject) return;
    await processMarkdownFile(
      mdObject,
      markdownFile,
      templateFilePath,
      base_dir
    );
    fuseList.push(mdObject);
  });
  await Promise.all(promises);
  await fs.writeFile(
    path.join(outputDirPath, "search.json"),
    JSON.stringify(fuseList)
  );
}

async function generateNavigation(rootDirPath, base_dir, level = 0) {
  let content = "";

  const processDirectory = async (dirPath, indentLevel) => {
    const itemNames = await fs.readdir(dirPath);

    for (let itemName of itemNames) {
      const indent = "  ".repeat(indentLevel);
      const itemPath = path.join(dirPath, itemName);

      // process sub-directories
      if ((await fs.lstat(itemPath)).isDirectory()) {
        const linkPath = "#";
        const linkText = itemName;

        if (linkText.startsWith(".")) {
          continue;
        }

        content += `${indent}* [${linkText}](${linkPath})\n`;
        await processDirectory(itemPath, indentLevel + 1);
        continue;
      }

      // process files (only markdown)
      if (!itemName.endsWith(".md")) {
        continue;
      }
      const linkPath = base_dir
        ? path.join(
            "/",
            base_dir,
            itemPath.replace(rootDirPath, "").replace(".md", ".html")
          )
        : itemPath.replace(".md", ".html");
      const linkText = itemName.slice(0, -3); // trim extension
      content += `${indent}* [${linkText}](${linkPath})\n`;
    }
  };

  await processDirectory(rootDirPath, level);
  return content;
}

async function findMarkdownFiles(outputDirPath) {
  const files = await fs.readdir(outputDirPath, {
    withFileTypes: true,
    recursive: true,
  });
  return files.filter((file) => path.extname(file.name) === ".md");
}

async function prepareMarkdownObject(
  outputDirPath,
  markdownFile,
  navigationContent
) {
  if (markdownFile.name === "SUMMARY.md") {
    return {};
  }

  const title = markdownFile.name.replace(".md", "");
  const navigation = navigationContent;
  const content = await fs.readFile(
    path.join(markdownFile.path, markdownFile.name),
    "utf-8"
  );
  const toc = markdownToc(content).content;
  const link = path.join(
    "/",
    path.relative(outputDirPath, markdownFile.path),
    markdownFile.name.replace(".md", ".html")
  );
  return { title, navigation, toc, content, link };
}

async function processMarkdownFile(
  markdownObject,
  markdownFile,
  templateFilePath,
  base_dir
) {
  if (markdownFile.name === "SUMMARY.md") {
    await fs.rm(path.join(markdownFile.path, markdownFile.name), {
      force: true,
    });
    return;
  }

  const newFileName = markdownFile.name.replace(".md", ".html");
  const oldPath = path.join(markdownFile.path, markdownFile.name);
  const newPath = path.join(markdownFile.path, newFileName);

  const navContent = marked.parse(markdownObject.navigation);
  const purifiedNavContent = DOMPurify.sanitize(navContent);

  const htmlContent = marked.parse(markdownObject.content);
  const purifiedHtmlContent = DOMPurify.sanitize(htmlContent);

  const htmlToc = marked.parse(markdownObject.toc);
  const purifiedHtmlToc = DOMPurify.sanitize(htmlToc);

  const templateContent = await fs.readFile(templateFilePath, "utf-8");
  const compiledTemplate = handlebars.compile(templateContent);
  const populatedContent = compiledTemplate({
    title: markdownObject.title,
    navigation: purifiedNavContent,
    toc: purifiedHtmlToc,
    content: purifiedHtmlContent,
    base_dir: base_dir,
  });
  const formattedContent = beautify.html(populatedContent, { indent_size: 2 });

  await fs.rename(oldPath, newPath);
  await fs.writeFile(newPath, formattedContent);
}
