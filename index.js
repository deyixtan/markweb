import path from "path";
import generateStaticSite from "./generator.js";

const INPUT_DIR_PATH = "./data";
const OUTPUT_DIR_PATH = "./dist";
const TEMPLATE_FILE_PATH = process.argv[2] || "templates/holiday.html";

async function main() {
  try {
    const baseDirPath = process.cwd();
    const inputDirPath = path.join(baseDirPath, INPUT_DIR_PATH);
    const ouputDirPath = path.join(baseDirPath, OUTPUT_DIR_PATH);
    const templateFilePath = path.join(baseDirPath, TEMPLATE_FILE_PATH);

    generateStaticSite(inputDirPath, ouputDirPath, templateFilePath);
  } catch (err) {
    console.error("Error generating static site:", err);
  }
}

(async () => {
  await main();
})();
