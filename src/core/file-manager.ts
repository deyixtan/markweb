import { Dirent, PathLike } from "fs";
import fs from "fs/promises";
import { Glob } from "glob";
import path from "path";
import config from "../config";

export async function prepareOutputDir(
  inputDirPath: string,
  outputDirPath: string,
  ignoreFilePath: string,
): Promise<void> {
  if (!(await isDirectory(inputDirPath))) {
    return Promise.reject(new Error(config.MSG_ERROR_INVALID_DIRECTORY));
  }

  await fs.rm(outputDirPath, { recursive: true, force: true });
  await fs.mkdir(outputDirPath, { recursive: true });
  await fs.cp(inputDirPath, outputDirPath, { recursive: true });

  // handle optional ignore file
  if (!(await isFile(ignoreFilePath))) return;

  const ignorePatternList = (await readFileContent(ignoreFilePath)).split("\n");
  const ignoreMatchedPaths = new Glob(ignorePatternList, { cwd: outputDirPath });
  for await (const ignoreMatchedPath of ignoreMatchedPaths) {
    const ignoreMatchedAbsPath = path.join(outputDirPath, ignoreMatchedPath);
    await fs.rm(ignoreMatchedAbsPath, { recursive: true, force: true });
  }
}

export async function generateCompatibilityFiles(outputDirPath: string): Promise<void> {
  // create index.html in output dir
  const indexFilePath = path.join(outputDirPath, "index.html");
  await fs.writeFile(indexFilePath, '<script>location.href = "README.html"</script>');

  // bypass Jekyll processing
  const jekyllBypassFilePath = path.join(outputDirPath, ".nojekyll");
  await fs.writeFile(jekyllBypassFilePath, "");
}

export async function isFile(path: PathLike): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch (_) {
    return false;
  }
}

export async function isDirectory(dirPath: PathLike): Promise<boolean> {
  return (await isFile(dirPath)) && (await fs.stat(dirPath)).isDirectory();
}

export async function getFiles(dirPath: PathLike): Promise<string[]> {
  return await fs.readdir(dirPath);
}

export async function getFilteredFilesRecurively(dirPath: PathLike, ext: string): Promise<Dirent[]> {
  const files = await fs.readdir(dirPath, { withFileTypes: true, recursive: true });
  return files.filter((file) => path.extname(file.name) === ext);
}

export async function renameFile(oldPath: PathLike, newPath: PathLike): Promise<void> {
  return await fs.rename(oldPath, newPath);
}

export async function readFileContent(filePath: PathLike): Promise<string> {
  return await fs.readFile(filePath, "utf-8");
}

export async function writeFileContent(filePath: PathLike, content: string): Promise<void> {
  await fs.writeFile(filePath, content);
}
