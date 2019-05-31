import { commands, ExtensionContext, window } from 'vscode';
import {
  createServerModule,
  SelectDirectory,
  QueryResolver
} from '@angular-console/server';
import { getPseudoTerminalFactory } from './pseudo-terminal.factory';
import { NestFactory } from '@nestjs/core';
import * as path from 'path';

const getPort = require('get-port'); // tslint:disable-line

export function getStoreForContext(context: ExtensionContext) {
  return {
    get: (key: string, defaultValue: any) =>
      context.globalState.get(key) || defaultValue,
    set: (key: string, value: any) => context.globalState.update(key, value),
    delete: (key: string) => context.globalState.update(key, undefined)
  };
}

export async function startServer(
  context: ExtensionContext,
  workspacePath?: string
) {
  const port = await getPort({ port: 8888 });
  const store = getStoreForContext(context);

  const selectDirectory: SelectDirectory = async ({ buttonLabel }) => {
    return await window
      .showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: buttonLabel
      })
      .then(value => {
        if (value && value.length) {
          return value[0].fsPath;
        } else {
          return undefined;
        }
      });
  };

  const showNotification = (
    message: string,
    notificationCommands: { label: string; action: any }[]
  ) => {
    window
      .showInformationMessage(
        message,
        ...notificationCommands.map(c => c.label)
      )
      .then(res => {
        const selectedCommand = notificationCommands.find(n => n.label === res);
        if (selectedCommand) {
          commands.executeCommand(
            selectedCommand.action.extension,
            undefined,
            selectedCommand.action.route
          );
        }
      });
  };

  const pseudoTerminalFactory = getPseudoTerminalFactory(context);

  const exports = [
    'serverAddress',
    'store',
    'selectDirectory',
    'pseudoTerminalFactory',
    'assetsPath',
    'showNotification'
  ];

  const assetsPath = path.join(context.extensionPath, 'assets', 'public');

  const queryResolver = new QueryResolver(store);

  // Pre-warm cache for workspace.
  if (workspacePath) {
    queryResolver.workspace(workspacePath, {});
  }

  const providers = [
    { provide: QueryResolver, useValue: queryResolver },
    { provide: 'serverAddress', useValue: `http://localhost:${port}` },
    { provide: 'store', useValue: store },
    { provide: 'selectDirectory', useValue: selectDirectory },
    { provide: 'pseudoTerminalFactory', useValue: pseudoTerminalFactory },
    { provide: 'assetsPath', useValue: assetsPath },
    { provide: 'showNotification', useValue: showNotification }
  ];

  console.log('starting server on port', port);

  const app = await NestFactory.create(createServerModule(exports, providers), {
    cors: true
  });
  app.useStaticAssets(assetsPath);

  return await app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}
