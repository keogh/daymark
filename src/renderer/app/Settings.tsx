import { Button } from '@/renderer/components/ui/button';
import { Spinner } from '@/renderer/components/ui/spinner';
import type {
  ThemePreference,
  WeekStartsOn,
} from '@/shared/contracts/settings';
import {
  settingsLoadErrorMessage,
  type SettingsController,
} from './use-settings-controller';

interface SettingsProps {
  readonly controller: SettingsController;
}

export const Settings = ({ controller }: SettingsProps) => (
  <section className="settings-view">
    <header className="settings-view__header">
      <h2>Settings</h2>
      <p>Preferences apply automatically. There is no Save step.</p>
    </header>

    {controller.loadState.status === 'loading' && (
      <div className="settings-state" role="status">
        <Spinner aria-hidden="true" />
        <p>Loading settings…</p>
      </div>
    )}

    {controller.loadState.status === 'error' && (
      <div className="settings-state">
        <p role="alert">{settingsLoadErrorMessage}</p>
        <Button onClick={controller.retry} type="button" variant="outline">
          Retry
        </Button>
      </div>
    )}

    {controller.loadState.status === 'ready' && (
      <div className="settings-preferences">
        <PreferenceGroup
          description="Choose the first day used for current-week analytics."
          disabled={controller.pendingPreference !== null}
          legend="Calendar"
          name="week-start"
          onChange={controller.setWeekStartsOn}
          options={[
            { label: 'Monday', value: 'monday' },
            { label: 'Sunday', value: 'sunday' },
          ]}
          selected={controller.loadState.settings.weekStartsOn}
          title="Week starts on"
        />
        <PreferenceGroup
          description="System follows this computer’s appearance automatically."
          disabled={controller.pendingPreference !== null}
          legend="Appearance"
          name="appearance"
          onChange={controller.setTheme}
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
          selected={controller.loadState.settings.theme}
          title="Appearance"
        />
        <p aria-live="polite" className="settings-pending" role="status">
          {controller.pendingPreference === null ? '' : 'Saving preference…'}
        </p>
        {controller.mutationError !== null && (
          <p className="settings-error" role="alert">
            {controller.mutationError}
          </p>
        )}
      </div>
    )}
  </section>
);

interface PreferenceOption<T extends string> {
  readonly label: string;
  readonly value: T;
}

interface PreferenceGroupProps<T extends string> {
  readonly description: string;
  readonly disabled: boolean;
  readonly legend: string;
  readonly name: string;
  readonly onChange: (value: T) => void;
  readonly options: readonly PreferenceOption<T>[];
  readonly selected: T;
  readonly title: string;
}

const PreferenceGroup = <T extends WeekStartsOn | ThemePreference>({
  description,
  disabled,
  legend,
  name,
  onChange,
  options,
  selected,
  title,
}: PreferenceGroupProps<T>) => (
  <fieldset className="settings-group" disabled={disabled}>
    <legend>{legend}</legend>
    <p className="settings-group__title">{title}</p>
    <p className="settings-group__description" id={`${name}-description`}>
      {description}
    </p>
    <div className="settings-options">
      {options.map((option) => (
        <label className="settings-option" key={option.value}>
          <input
            aria-label={option.label}
            aria-describedby={`${name}-description`}
            checked={selected === option.value}
            name={name}
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          <span>{option.label}</span>
          {selected === option.value && (
            <span aria-hidden="true" className="settings-option__status">
              Selected
            </span>
          )}
        </label>
      ))}
    </div>
  </fieldset>
);
