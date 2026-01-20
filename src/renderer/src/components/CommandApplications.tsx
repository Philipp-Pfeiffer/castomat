import shuffle from 'lodash.shuffle'

import { winElectron } from '@renderer/lib/utils'
import { CommandGroup, CommandItem } from '@renderer/elements/Command'
import { useInstalledApplications } from '@renderer/hooks'

type CommandApplicationsProps = { commandSearch: string }

export const CommandApplications = ({ commandSearch }: CommandApplicationsProps) => {
  const applications = useInstalledApplications()

  const handleOpenApplication = async (command: string) => {
    if (winElectron?.openApplication) {
      await winElectron.openApplication(command)
    }
  }

  const onSelectApplication = async (applicationCommand: string) => {
    await handleOpenApplication(applicationCommand)
    winElectron.hideMainWindow()
  }

  const applicationsToDisplay = commandSearch ? applications : shuffle(applications).slice(0, 5)

  return (
    <CommandGroup heading="Applications">
      {applicationsToDisplay.map((application) => (
        <CommandItem
          key={application.name}
          onSelect={() => onSelectApplication(application.command)}
          value={application.name}
          keywords={[application.name]}
        >
          <div className="flex flex-1 items-center justify-between">
            <div className="flex gap-2.5 items-center">
              <div
                className="flex items-center justify-center h-6 w-6 rounded-lg"
                style={{ backgroundColor: '#059669' }}
              >
                <i className="ph ph-app-window text-sm" />
              </div>
              <span> {application.name}</span>
            </div>
            <span className="text-xs text-white/40">Application</span>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
