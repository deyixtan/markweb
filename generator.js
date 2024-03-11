import fs from "fs/promises";
import handlebars from "handlebars";
import hljs from "highlight.js";
import DOMPurify from 'isomorphic-dompurify';
import beautify from "js-beautify";
import { Marked } from "marked";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { markedHighlight } from "marked-highlight";
import markdownToc from "markdown-toc"
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

export default async function generateStaticSite(inputDirPath, outputDirPath, templateFilePath, base_dir) {
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
  const markdownFiles = await findMarkdownFiles(outputDirPath);
  const promises = markdownFiles.map(async (markdownFile) => {
    const navigationContent = await generateNavigation(outputDirPath, path.join(markdownFile.path, markdownFile.name));
    const mdObject = await prepareMarkdownObject(outputDirPath, markdownFile, navigationContent);
    if (!mdObject)
      return;
    await processMarkdownFile(mdObject, markdownFile, templateFilePath, base_dir);
    fuseList.push(mdObject);
  });
  await Promise.all(promises);
  await fs.writeFile(path.join(outputDirPath, "search.json"), JSON.stringify(fuseList));
}

async function generateNavigation(outputDirPath, currMarkdownFilePath) {
  const summaryFilePath = path.join(outputDirPath, "SUMMARY.md");

  // check if SUMMARY.md exists
  try {
    await fs.access(summaryFilePath);
  } catch {
    return "";
  }

  // read and parse SUMMARY.md
  const summaryContent = await fs.readFile(summaryFilePath, "utf-8");
  const lines = summaryContent.split("\n");
  let content = "";

  lines.forEach((line) => {
    const match = line.match(/^(\s*)[\*\-] \[(.*)\]\((.*)\)\s*$/);
    if (!match) return;

    const prefix = match[1];
    const title = match[2];
    const link = match[3];

    const currDirPath = path.dirname(currMarkdownFilePath);
    const markdownFilePath = `${outputDirPath}/${link}`;

    let pathToMarkdown = path.relative(currDirPath, markdownFilePath);
    if (!pathToMarkdown.startsWith(".")) {
      pathToMarkdown = "./" + pathToMarkdown;
    }
    pathToMarkdown = pathToMarkdown.endsWith(".md") ? pathToMarkdown.replace(".md", ".html") : "#";

    content += `${prefix}* [${title}](${pathToMarkdown})\n`;
  });

  return content;
}

async function findMarkdownFiles(outputDirPath) {
  const files = await fs.readdir(outputDirPath, {
    withFileTypes: true,
    recursive: true,
  });
  return files.filter((file) => path.extname(file.name) === ".md");
}

async function prepareMarkdownObject(outputDirPath, markdownFile, navigationContent) {
  if (markdownFile.name === "SUMMARY.md") {
    return {};
  }

  const title = markdownFile.name.replace(".md", "");
  const navigation = navigationContent;
  const content = await fs.readFile(path.join(markdownFile.path, markdownFile.name), "utf-8");
  const toc = markdownToc(content).content;
  const link = path.join("/", path.relative(outputDirPath, markdownFile.path), markdownFile.name.replace(".md", ".html"));
  return { title, navigation, toc, content, link };
}

async function processMarkdownFile(markdownObject, markdownFile, templateFilePath, base_dir) {
  if (markdownFile.name === "SUMMARY.md") {
    await fs.rm(path.join(markdownFile.path, markdownFile.name), { force: true });
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
