import fs from "fs/promises";
import handlebars from "handlebars";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import path from "path";
import beautify from "js-beautify";
import hljs from "highlight.js";

// taken from https://github.com/markedjs/marked-highlight
const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  })
);

export default async function generateStaticSite(inputDirPath, outputDirPath, templateFilePath) {
  await prepareOutputDirectory(inputDirPath, outputDirPath);
  await processMarkdownFiles(outputDirPath, templateFilePath);
}

async function prepareOutputDirectory(inputDirPath, outputDirPath) {
  await fs.rm(outputDirPath, { recursive: true, force: true });
  await fs.mkdir(outputDirPath, { recursive: true });
  await fs.cp(inputDirPath, outputDirPath, { recursive: true });
}

async function processMarkdownFiles(outputDirPath, templateFilePath) {
  const markdownFiles = await findMarkdownFiles(outputDirPath);
  markdownFiles.forEach(async (markdownFile) => {
    const navigationContent = await generateNavigation(outputDirPath, path.join(markdownFile.path, markdownFile.name));
    await processMarkdownFile(markdownFile, templateFilePath, navigationContent);
  });
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

  return marked.parse(content);
}

async function findMarkdownFiles(outputDirPath) {
  const files = await fs.readdir(outputDirPath, {
    withFileTypes: true,
    recursive: true,
  });
  return files.filter((file) => path.extname(file.name) === ".md");
}

async function processMarkdownFile(markdownFile, templateFilePath, navigationContent) {
  if (markdownFile.name === "SUMMARY.md") {
    await fs.rm(path.join(markdownFile.path, markdownFile.name), { force: true });
    return;
  }

  const newFileName = markdownFile.name.replace(".md", ".html");
  const oldPath = path.join(markdownFile.path, markdownFile.name);
  const newPath = path.join(markdownFile.path, newFileName);

  const mdContent = await fs.readFile(oldPath, "utf-8");
  const htmlContent = marked.use({ gfm: true }).parse(mdContent);
  const templateContent = await fs.readFile(templateFilePath, "utf-8");
  const compiledTemplate = handlebars.compile(templateContent);
  const populatedContent = compiledTemplate({ content: htmlContent, navigation: navigationContent });
  const formattedContent = beautify.html(populatedContent, { indent_size: 2 });

  await fs.rename(oldPath, newPath);
  await fs.writeFile(newPath, formattedContent);
}
