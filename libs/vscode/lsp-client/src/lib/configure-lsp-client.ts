/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  NxChangeWorkspace,
  NxWorkspaceRefreshNotification,
} from '@nx-console/language-server/types';
import { NxWorkspace } from '@nx-console/shared/types';
import { getOutputChannel, getWorkspacePath } from '@nx-console/vscode/utils';
import { join } from 'path';
import { commands, Disposable, ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  NotificationType,
  RequestType,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;
let pending: Array<
  { resolve: (value: any) => void; params: any } & (
    | { method: 'sendRequest'; type: RequestType<any, any, any> }
    | { method: 'sendNotification'; type: NotificationType<any> }
  )
> = [];

export function configureLspClient(
  context: ExtensionContext,
  refreshCommand: string | undefined
): Disposable {
  if (client) {
    getOutputChannel().appendLine('Using existing client');
    sendNotification(NxChangeWorkspace, getWorkspacePath());
    return {
      dispose,
    };
  }

  const serverModule = context.asAbsolutePath(join('nxls', 'main.js'));

  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },

    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    initializationOptions: {
      workspacePath: getWorkspacePath(),
    },
    documentSelector: [
      { scheme: 'file', language: 'json', pattern: '**/nx.json' },
      { scheme: 'file', language: 'json', pattern: '**/project.json' },
      { scheme: 'file', language: 'json', pattern: '**/workspace.json' },
      { scheme: 'file', language: 'json', pattern: '**/package.json' },
    ],
    synchronize: {},
  };

  client = new LanguageClient(
    'NxConsoleClient',
    'Nx Console Client',
    serverOptions,
    clientOptions
  );

  client.start();

  for (const action of pending) {
    switch (action.method) {
      case 'sendNotification':
        action.resolve(client.sendNotification(action.type, action.params));
        break;
      case 'sendRequest':
        action.resolve(client.sendRequest(action.type, action.params));
        break;
    }
  }
  pending = [];

  // nxls is telling us to refresh projects on this side
  client.onNotification(NxWorkspaceRefreshNotification, () => {
    if (refreshCommand) {
      getOutputChannel().appendLine('Refreshing ui due to lsp notification');
      commands.executeCommand(refreshCommand);
    }
  });

  getOutputChannel().appendLine('Initialized lsp client');
  return {
    dispose,
  };
}

function dispose() {
  if (!client) {
    return;
  }

  client.stop();
  client = undefined;
}

export function sendNotification<P>(
  notificationType: NotificationType<P>,
  params?: P
) {
  getOutputChannel().appendLine(`sendNotification: ${notificationType.method}`);
  if (!client) {
    return new Promise<void>((resolve) => {
      pending.push({
        resolve,
        method: 'sendNotification',
        type: notificationType,
        params,
      });
    });
  }
  return client!.sendNotification(notificationType, params);
}

export function sendRequest<P, R, E>(
  requestType: RequestType<P, R, E>,
  params: P
) {
  getOutputChannel().appendLine(`sendRequest: ${requestType.method}`);
  if (!client) {
    return new Promise<R>((resolve) => {
      pending.push({
        resolve,
        method: 'sendRequest',
        type: requestType,
        params,
      });
    });
  }
  return client.sendRequest(requestType, params);
}
