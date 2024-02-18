import fs from "fs";
import handlebars from "handlebars";
import { marked } from "marked";
import path from "path";

function convertMarkdownToHtml(markdownPath) {
    const markdownContent = fs.readFileSync(markdownPath, "utf-8");
    return marked.parse(markdownContent);
}

function populateTemplate(templatePath, templateData) {
    const templateContent = fs.readFileSync(templatePath, "utf-8");
    const compiledTemplate = handlebars.compile(templateContent);
    return compiledTemplate(templateData)
}

try {
    const files = fs.readdirSync("./data/");
    files.forEach(file => {
        if (!file.endsWith(".md")) {
            return;
        }

        const inputFilePath = path.join("./data/", file)
        const outputFilePath = path.join("./dist/", file.replace(".md", ".html"))

        const title = "My title";
        const content = convertMarkdownToHtml(inputFilePath);
        const templateContent = { title, content };
        const populatedTemplateContent = populateTemplate("./templates/index.html", templateContent);

        fs.mkdirSync(path.dirname(outputFilePath), { recursive: true })
        fs.writeFileSync(outputFilePath, populatedTemplateContent);
    });
} catch (err) {
    console.error(err);
}
console.log("Done")
