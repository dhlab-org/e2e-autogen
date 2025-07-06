import { ColumnUtil } from "./column-util";
import { ScenarioSheet } from "./scenario-sheet";
import { DataRangeDetector } from "./data-range-detector";
import { GoogleSheetsService } from "./google-sheets-service";
import { ScenarioDataConverter } from "./scenario-data-converter";
import { SpreadsheetUrlParser } from "./spreadsheet-url-parser";

function createScenarioSheet(url: string): ScenarioSheet {
  const urlParser = new SpreadsheetUrlParser(url);
  const sheetsService = new GoogleSheetsService();
  const columnUtil = new ColumnUtil();
  const rangeDetector = new DataRangeDetector(
    sheetsService,
    urlParser,
    columnUtil
  );
  const dataConverter = new ScenarioDataConverter();

  return new ScenarioSheet(
    urlParser,
    sheetsService,
    rangeDetector,
    dataConverter,
    columnUtil
  );
}

export { createScenarioSheet };
