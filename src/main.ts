import { OptionValues, program } from "commander";
import config from "./config";
import generateSite from "./generator";
import packageJson from "../package.json";

async function main(options: OptionValues) {
  try {
    await generateSite(options);
    console.log(config.MSG_SUCCESS_GENERATED);
  } catch (err) {
    console.error(options?.debug ? err : config.MSG_ERROR_CATCH_ALL);
  }
}

(async () => {
  program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(packageJson.version, config.PROGARG_FLAG_VERSION, config.PROGARG_DESC_VERSION)
    .requiredOption(config.PROGARG_FLAG_INPUT_DIR_PATH, config.PROGARG_DESC_INPUT_DIR_PATH)
    .requiredOption(config.PROGARG_FLAG_OUTPUT_DIR_PATH, config.PROGARG_DESC_OUTPUT_DIR_PATH)
    .requiredOption(config.PROGARG_FLAG_TEMPLATE_FILE_PATH, config.PROGARG_DESC_TEMPLATE_FILE_PATH)
    .option(config.PROGARG_FLAG_DEBUG, config.PROGARG_DESC_DEBUG)
    .option(config.PROGARG_FLAG_PREFIX, config.PROGARG_DESC_PREFIX)
    .parse();

  await main(program.opts());
})();
