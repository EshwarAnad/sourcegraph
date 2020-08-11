import * as H from 'history'
import * as GQL from '../../../../shared/src/graphql/schema'
import React, { useState, useCallback, useEffect } from 'react'
import { InteractiveModeInput } from './interactive/InteractiveModeInput'
import { Form } from 'reactstrap'
import { SearchModeToggle } from './interactive/SearchModeToggle'
import { VersionContextDropdown } from '../../nav/VersionContextDropdown'
import { LazyMonacoQueryInput } from './LazyMonacoQueryInput'
import { QueryInput } from './QueryInput'
import { KEYBOARD_SHORTCUT_FOCUS_SEARCHBAR, KeyboardShortcutsProps } from '../../keyboardShortcuts/keyboardShortcuts'
import { SearchButton } from './SearchButton'
import { Link } from '../../../../shared/src/components/Link'
import { SearchScopes } from './SearchScopes'
import { QuickLinks } from '../QuickLinks'
import { Notices } from '../../global/Notices'
import { SettingsCascadeProps, isSettingsValid } from '../../../../shared/src/settings/settings'
import { Settings } from '../../schema/settings.schema'
import { ThemeProps } from '../../../../shared/src/theme'
import { ThemePreferenceProps } from '../../theme'
import { ActivationProps } from '../../../../shared/src/components/activation/Activation'
import {
    PatternTypeProps,
    CaseSensitivityProps,
    InteractiveSearchProps,
    SmartSearchFieldProps,
    CopyQueryButtonProps,
} from '..'
import { EventLoggerProps } from '../../tracking/eventLogger'
import { ExtensionsControllerProps } from '../../../../shared/src/extensions/controller'
import { PlatformContextProps } from '../../../../shared/src/platform/context'
import { VersionContextProps } from '../../../../shared/src/search/util'
import { VersionContext } from '../../schema/site.schema'
import { submitSearch, SubmitSearchParams } from '../helpers'
import { searchOnboardingTour } from './SearchOnboardingTour'
import { generateLangsList } from './MonacoQueryInput'
import { isEqual } from 'lodash'

interface Props
    extends SettingsCascadeProps<Settings>,
        ThemeProps,
        ThemePreferenceProps,
        ActivationProps,
        PatternTypeProps,
        CaseSensitivityProps,
        KeyboardShortcutsProps,
        EventLoggerProps,
        ExtensionsControllerProps<'executeCommand' | 'services'>,
        PlatformContextProps<'forceUpdateTooltip' | 'settings'>,
        InteractiveSearchProps,
        SmartSearchFieldProps,
        CopyQueryButtonProps,
        Pick<SubmitSearchParams, 'source'>,
        VersionContextProps {
    authenticatedUser: GQL.IUser | null
    location: H.Location
    history: H.History
    isSourcegraphDotCom: boolean
    setVersionContext: (versionContext: string | undefined) => void
    availableVersionContexts: VersionContext[] | undefined
    /** Whether globbing is enabled for filters. */
    globbing: boolean
    /** Whether to display the interactive mode input centered on the page, as on the search homepage. */
    interactiveModeHomepageMode?: boolean
    /** A query fragment to appear at the beginning of the input. */
    queryPrefix?: string
    autoFocus?: boolean
    endFirstStep?: () => void
    endSecondStep?: (query: string) => void

    // For NavLinks
    authRequired?: boolean
    showCampaigns: boolean
}

function endFirstStep(): void {
    if (
        isEqual(searchOnboardingTour.getCurrentStep(), searchOnboardingTour.getById('step-1')) &&
        searchOnboardingTour.getCurrentStep()?.isOpen()
    ) {
        searchOnboardingTour.next()
    }
}

export const SearchPageInput: React.FunctionComponent<Props> = (props: Props) => {
    /** The query cursor position and value entered by the user in the query input */
    const [userQueryState, setUserQueryState] = useState({
        query: props.queryPrefix ? props.queryPrefix : '',
        cursorPosition: props.queryPrefix ? props.queryPrefix.length : 0,
    })

    useEffect(() => {
        setUserQueryState({ query: props.queryPrefix || '', cursorPosition: props.queryPrefix?.length || 0 })
    }, [props.queryPrefix])

    /** Onboarding tour */
    function generateStep1(): HTMLElement {
        const element = document.createElement('div')
        element.className = 'd-flex flex-column'
        const title = document.createElement('h4')
        title.textContent = 'Code search tour'
        const description = document.createElement('div')
        description.textContent = 'How would you like to begin?'
        const languageListItem = document.createElement('li')
        languageListItem.className = 'list-group-item p-0 border-0'
        languageListItem.textContent = '-'
        const languageButton = document.createElement('button')
        languageButton.className = 'btn btn-link p-0 pl-1'
        languageButton.textContent = 'Search a language'
        languageListItem.append(languageButton)
        // TODO farhan: Need to tell our tour that we're on the lang path
        languageButton.addEventListener('click', () => {
            setUserQueryState({ query: 'lang:', cursorPosition: 'lang:'.length })
            searchOnboardingTour.show('step-2-lang')
        })
        const repositoryListItem = document.createElement('li')
        repositoryListItem.className = 'list-group-item p-0 border-0'
        repositoryListItem.textContent = '-'
        const repositoryButton = document.createElement('button')
        repositoryButton.className = 'btn btn-link p-0 pl-1'
        repositoryButton.textContent = 'Search a repository'
        // TODO farhan: Need to tell our tour that we're on the repo path
        repositoryButton.addEventListener('click', () => {
            setUserQueryState({ query: 'repo:', cursorPosition: 'repo:'.length })
            searchOnboardingTour.show('step-2-repo')
        })
        repositoryListItem.append(repositoryButton)
        element.append(title)
        element.append(description)
        element.append(languageListItem)
        element.append(repositoryListItem)
        return element
    }

    function generateStep3(query: string): HTMLElement {
        const langsList = generateLangsList()
        let example = ''
        if (Object.keys(langsList).includes(query)) {
            example = langsList[query]
        }
        const element = document.createElement('div')
        const title = document.createElement('h4')
        title.textContent = 'Add code to your search'
        const description = document.createElement('div')
        description.textContent = 'Type the name of a function, variable or other code. Or try an example:'
        const listItem = document.createElement('li')
        listItem.className = 'list-group-item p-0 border-0'
        listItem.textContent = '>'
        const exampleButton = document.createElement('button')
        exampleButton.className = 'btn btn-link'
        exampleButton.textContent = example
        exampleButton.addEventListener('click', () => {
            const fullQuery = [query, example].join(' ')
            setUserQueryState({ query: fullQuery, cursorPosition: fullQuery.length })
            if (query.startsWith('lang:')) {
                searchOnboardingTour.show('step-4')
            } else {
                searchOnboardingTour.show('step-4-repo')
            }
        })
        listItem.append(exampleButton)
        element.append(title)
        element.append(description)
        element.append(listItem)
        return element
    }

    function endSecondStep(query: string): void {
        if (
            isEqual(searchOnboardingTour.getCurrentStep(), searchOnboardingTour.getById('step-2-lang')) &&
            searchOnboardingTour.getCurrentStep()?.isOpen()
        ) {
            searchOnboardingTour.show('step-3')
            searchOnboardingTour.getById('step-3').updateStepOptions({ text: generateStep3(query) })
        }
    }

    const onboardingTour = searchOnboardingTour.addSteps([
        {
            id: 'step-1',
            text: generateStep1(),
            attachTo: {
                element: '.search-page__search-container',
                on: 'bottom',
            },
            classes: 'example-step-extra-class',
        },
        {
            id: 'step-2-lang',

            text: '<h4>Type to filter the language autocomplete</h4>',
            attachTo: {
                element: '.search-page__search-container',
                on: 'bottom',
            },
        },
        {
            id: 'step-2-repo',
            text: "Type the name of a repository you've used recently to filter the autocomplete list",
            attachTo: {
                element: '.search-page__search-container',
                on: 'bottom',
            },
        },
        {
            id: 'step-3',
            attachTo: {
                element: '.search-page__search-container',
                on: 'bottom',
            },
        },
        {
            id: 'step-4',
            text: 'Review the search reference',
            attachTo: {
                element: '.search-help-dropdown-button',
                on: 'bottom',
            },
            advanceOn: { selector: '.search-help-dropdown-button', event: 'click' },
        },
        {
            id: 'final-step',
            text: "<h4>Use the 'return' key or the search button to run your search</h4>",
            attachTo: {
                element: '.search-button',
                on: 'bottom',
            },
            advanceOn: { selector: '.search-button__btn', event: 'click' },
        },
    ])

    useEffect(() => {
        onboardingTour.start()
        return () => onboardingTour.complete()
    }, [onboardingTour])

    const quickLinks =
        (isSettingsValid<Settings>(props.settingsCascade) && props.settingsCascade.final.quicklinks) || []

    const onSubmit = useCallback(
        (event?: React.FormEvent<HTMLFormElement>): void => {
            // False positive
            // eslint-disable-next-line no-unused-expressions
            event?.preventDefault()

            submitSearch({ ...props, query: userQueryState.query, source: 'home' })
        },
        [props, userQueryState.query]
    )

    const onChange = useCallback(
        (event?: React.FormEvent<HTMLFormElement>): void => {
            // eslint-disable-next-line no-unused-expressions
            event?.preventDefault()

            if (props.endFirstStep) {
                // TODO farhan: Check tour is open
                props.endFirstStep()
            }
        },
        [props]
    )

    return (
        <div className="d-flex flex-row flex-shrink-past-contents">
            {props.splitSearchModes && props.interactiveSearchMode ? (
                <InteractiveModeInput
                    {...props}
                    navbarSearchState={userQueryState}
                    onNavbarQueryChange={setUserQueryState}
                    toggleSearchMode={props.toggleSearchMode}
                    lowProfile={false}
                    homepageMode={props.interactiveModeHomepageMode}
                />
            ) : (
                <>
                    <Form className="flex-grow-1 flex-shrink-past-contents" onSubmit={onSubmit} onChange={onChange}>
                        <div className="search-page__input-container">
                            {props.splitSearchModes && (
                                <SearchModeToggle {...props} interactiveSearchMode={props.interactiveSearchMode} />
                            )}
                            <VersionContextDropdown
                                history={props.history}
                                caseSensitive={props.caseSensitive}
                                patternType={props.patternType}
                                navbarSearchQuery={userQueryState.query}
                                versionContext={props.versionContext}
                                setVersionContext={props.setVersionContext}
                                availableVersionContexts={props.availableVersionContexts}
                            />
                            {props.smartSearchField ? (
                                <LazyMonacoQueryInput
                                    {...props}
                                    hasGlobalQueryBehavior={true}
                                    queryState={userQueryState}
                                    onChange={setUserQueryState}
                                    onSubmit={onSubmit}
                                    autoFocus={props.autoFocus !== false}
                                    endFirstStep={endFirstStep}
                                    endSecondStep={endSecondStep}
                                />
                            ) : (
                                <QueryInput
                                    {...props}
                                    value={userQueryState}
                                    onChange={setUserQueryState}
                                    // We always want to set this to 'cursor-at-end' when true.
                                    autoFocus={props.autoFocus ? 'cursor-at-end' : props.autoFocus}
                                    hasGlobalQueryBehavior={true}
                                    patternType={props.patternType}
                                    setPatternType={props.setPatternType}
                                    withSearchModeToggle={props.splitSearchModes}
                                    keyboardShortcutForFocus={KEYBOARD_SHORTCUT_FOCUS_SEARCHBAR}
                                />
                            )}
                            <SearchButton />
                        </div>
                        <div className="search-page__input-sub-container">
                            {!props.splitSearchModes && (
                                <Link className="btn btn-link btn-sm pl-0" to="/search/query-builder">
                                    Query builder
                                </Link>
                            )}
                            <SearchScopes
                                history={props.history}
                                query={userQueryState.query}
                                authenticatedUser={props.authenticatedUser}
                                settingsCascade={props.settingsCascade}
                                patternType={props.patternType}
                                versionContext={props.versionContext}
                            />
                        </div>
                        <QuickLinks quickLinks={quickLinks} className="search-page__input-sub-container" />
                        <Notices
                            className="my-3"
                            location="home"
                            settingsCascade={props.settingsCascade}
                            history={props.history}
                        />
                    </Form>
                </>
            )}
        </div>
    )
}
