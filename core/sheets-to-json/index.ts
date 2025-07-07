import { GoogleSheetsService } from "./google-sheets-service";
import { SpreadsheetUrlParser } from "./spreadsheet-url-parser";
import { ScenarioSheetFactory } from "./scenario-sheet-factory";
import { ScenarioCollector } from "./scenario-collector";

function createScenarioCollector(url: string): ScenarioCollector {
  const parser = new SpreadsheetUrlParser(url);
  const sheetsService = new GoogleSheetsService();
  const factory = new ScenarioSheetFactory(sheetsService);

  return new ScenarioCollector(url, parser, sheetsService, factory);
}

export { createScenarioCollector };
