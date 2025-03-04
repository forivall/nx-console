import { WorkspaceConfigurationStore } from '@nx-console/vscode/configuration';
import { EXECUTE_ARBITRARY_COMMAND } from '@nx-console/vscode/nx-commands-view';
import { commands, ExtensionContext, window } from 'vscode';

let run = false;

export async function initNxConversion(context: ExtensionContext) {
  if (run) {
    return;
  }
  run = true;
  const now = new Date();
  const lastConversionNotficationTime =
    WorkspaceConfigurationStore.instance.get('nxConversionDate', 0);

  const command = commands.registerCommand(
    'nxConsole.migrateAngularCliToNx',
    () => commands.executeCommand(EXECUTE_ARBITRARY_COMMAND, 'nx init')
  );
  context.subscriptions.push(command);

  if (now.getDay() === new Date(lastConversionNotficationTime).getDay()) {
    return;
  }

  WorkspaceConfigurationStore.instance.set('nxConversionDate', now.getTime());
  const answer = await window.showInformationMessage(
    "It's time to migrate! \n To keep using Nx Console's powerful capabilities, please transition your Angular workspace to Nx. ",
    'Migrate Now',
    'Learn More'
  );
  if (answer === 'Migrate Now') {
    commands.executeCommand(EXECUTE_ARBITRARY_COMMAND, 'nx init');
    return;
  }
  if (answer === 'Learn More') {
    commands.executeCommand(
      'vscode.open',
      'https://nx.dev/recipes/adopting-nx/migration-angular'
    );
    return;
  }
}
