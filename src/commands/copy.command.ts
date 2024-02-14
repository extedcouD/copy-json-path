import { env, window, workspace } from 'vscode';
import { LoggerService } from '../logger.service';
import getJsonPath from '../json.path';
import { Command } from '../decorators/command.decorator';
import * as vscode from 'vscode';

enum FileType {
  JSON = 'json',
  JSONC = 'jsonc',
}

@Command()
export class Copy {
  constructor(private loggerService: LoggerService) {
    this.loggerService = loggerService;
  }

  private canExecuteCommand(): boolean {
    const fileLanguage = window?.activeTextEditor?.document?.languageId;
    this.loggerService.debug(`File language: ${fileLanguage}`);

    const isJsonFile = Object.values(FileType).includes(
      fileLanguage as FileType,
    );

    if (!isJsonFile) {
      this.loggerService.error(
        'You must be in a json file to execute this command',
      );
    }

    return isJsonFile;
  }

  register() {
    if (!this.canExecuteCommand()) {
      return;
    }

    const editor = window.activeTextEditor;
    const text = editor?.document.getText();
    const offset = editor?.document.offsetAt(editor?.selection.start);

    const configuration = workspace.getConfiguration('json.copyJsonPath');

    const includeFileName = configuration.get<boolean>('includeFileName');
    const useBracketNotation = configuration.get<boolean>('useBracketNotation');
    const quote = configuration.get<String>('quote');
    const pathOutput = configuration.get<string>('output') ?? '%PATH%';

    this.loggerService.debug(`PathOutput: ${pathOutput}`);

    if (offset && text) {
      const rawPath: string = getJsonPath(text, offset, editor, {
        includeFileName,
        useBracketNotation,
        quote,
      });
      this.loggerService.debug(`Raw path: ${rawPath}`);

      const path = pathOutput.replace('%PATH%', rawPath);

      env.clipboard
        .writeText(convertFormat(path))
        .then(() => this.loggerService.log('Path copied'));
    } else {
      this.loggerService.error('Fail to copy path');
    }
  }
}

function convertFormat(input: string): string {
  const lastBracketsIndex = input.lastIndexOf('[]');
  if (lastBracketsIndex !== -1) {
    const prefix = input.substring(0, lastBracketsIndex); //.replace(/\[\]/g, '{}');
    const remaining = input.substring(lastBracketsIndex + 2);
    const suffix = remaining.substring(1);
    return prefix + '[]{@:' + suffix + '}';
  }
  return input;
}
