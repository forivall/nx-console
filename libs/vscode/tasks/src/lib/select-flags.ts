import { Option } from '@nx-console/shared/schema';
import { QuickPickItem, window } from 'vscode';
import { CliTaskFlagQuickPickItem } from './cli-task-flag-quick-pick-item';

/**
 * Returns undefined if the user wants to cancel the command.
 * Returns an empty array to run the command without flags.
 * Returns an array populated with flags if the user provides them.
 */
export async function selectFlags(
  command: string,
  options: Option[],
  userSetFlags: { [key: string]: string } = {}
): Promise<string[] | undefined> {
  const flagArray = Object.entries(userSetFlags).map(
    ([flagName, value]) => `--${flagName}=${value}`
  );

  const selection = await promptForFlagToSet(
    `nx ${command} ${flagArray.join(' ')}`,
    options
  );

  if (!selection.flag) {
    return selection.execute ? flagArray : undefined;
  }

  const flagValue = await promptForFlagValue(selection.flag);

  if (flagValue && flagValue.length > 0) {
    userSetFlags[selection.flag.flagName] = flagValue;
  } else {
    delete userSetFlags[selection.flag.flagName];
  }

  return selectFlags(command, options, userSetFlags);
}

async function promptForFlagToSet(
  currentCommand: string,
  options: Option[]
): Promise<{
  execute?: boolean;
  flag?: CliTaskFlagQuickPickItem;
}> {
  const flagItems: Array<QuickPickItem | CliTaskFlagQuickPickItem> = [
    {
      picked: true,
      alwaysShow: true,
      label: `Execute: ${currentCommand}`,
    },
    ...options.map((option) => {
      const detail =
        option.description ??
        (Array.isArray(option.type) ? option.type?.[0] : option.type);
      return new CliTaskFlagQuickPickItem(
        option.name,
        detail,
        option,
        `${option.name}`
      );
    }),
  ];

  const selection = await window.showQuickPick(flagItems, {
    placeHolder: 'Execute command or set flags',
  });

  if (!selection) {
    return { execute: false };
  }

  const flagSelected = Boolean((selection as CliTaskFlagQuickPickItem).option);
  if (!flagSelected) {
    return { execute: true };
  } else {
    return {
      flag: selection as CliTaskFlagQuickPickItem,
    };
  }
}

function promptForFlagValue(flagToSet: CliTaskFlagQuickPickItem) {
  const placeHolder = `--${flagToSet.flagName}=...`;
  if (flagToSet.option.type === 'boolean') {
    return window.showQuickPick(['true', 'false'], {
      placeHolder,
    });
  } else if (flagToSet.option.enum && flagToSet.option.enum.length) {
    return window.showQuickPick([...flagToSet.option.enum.map(String)], {
      placeHolder,
      canPickMany: flagToSet.option.type === 'array',
    });
  } else {
    return window.showInputBox({
      placeHolder,
    });
  }
}
