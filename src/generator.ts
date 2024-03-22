import commander from "commander";
import path from "path";
import config from "./config";
import { generateCompatibilityFiles, prepareOutputDir } from "./core/file-manager";
import { processOutputDir } from "./core/markdown-manager";

export default async function generateSite(options: commander.OptionValues): Promise<void> {
  // process program options
  const projectRootDir = process.cwd();
  const inputDirPath = path.isAbsolute(options.inputDirPath)
    ? options.inputDirPath
    : path.join(projectRootDir, options.inputDirPath);
  const outputDirPath = path.isAbsolute(options.outputDirPath)
    ? options.outputDirPath
    : path.join(projectRootDir, options.outputDirPath);
  const templateFilePath = path.isAbsolute(options.templateFilePath)
    ? options.templateFilePath
    : path.join(projectRootDir, options.templateFilePath);
  const linkPrefix = options?.linkPrefix || "";
  const ignoreFilePath = path.join(outputDirPath, config.IGNORE_FILE_NAME);

  // start generating
  await prepareOutputDir(inputDirPath, outputDirPath, ignoreFilePath);
  await processOutputDir(outputDirPath, templateFilePath, linkPrefix);
  await generateCompatibilityFiles(outputDirPath);
}
