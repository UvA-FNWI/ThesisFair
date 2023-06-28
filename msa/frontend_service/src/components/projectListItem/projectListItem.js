import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import chevronDownIcon from 'bootstrap-icons/icons/chevron-down.svg'
import closeIcon from 'bootstrap-icons/icons/x-lg.svg'
import gripIcon from 'bootstrap-icons/icons/grip-vertical.svg'

import './projectListItem.scss'
import Tag from '../tag/tag'

import cl from 'clsx'

function ProjectListItem(props) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const addProject = () => {
    // TODO: Add project
    console.warn('Add project not implemented')
  }

  const removeProject = () => {
    // TODO: Remove project
    console.warn('Remove project not implemented')
  }

  const hideProject = () => {
    // TODO: Hide project
    console.warn('Hide project not implemented')
  }

  const unhideProject = () => {
    // TODO: Unhide project
    console.warn('Unhide project not implemented')
  }

  return (
    <li className='list-item'>
      <div className='list-item__header'>
        {props.selected && <img className='list-item__icon list-item__icon--grip' src={gripIcon} alt='grip icon' />}

        <img
          className={`list-item__icon list-item__icon--expand${isExpanded ? ' list-item__icon--rotated' : ''}`}
          src={chevronDownIcon}
          alt='expand icon'
          onClick={toggleExpanded}
        />

        <div className='list-item__title'>
          <p>{props.project.name}</p>
        </div>

        {props.project.tags && (
          <div className='list-item__tags'>
            {props.project.tags
              .filter(tag => ['AI', 'SE', 'CS', 'CPS'].includes(tag))
              .map(tag => (
                <Tag key={tag} label={tag} />
              ))}
          </div>
        )}

        {props.selected && (
          <img
            className='list-item__icon list-item__icon--close'
            src={closeIcon}
            alt='close icon'
            onClick={removeProject}
          />
        )}
      </div>

      {/* Expanded view */}
      <div
        className={cl('list-item__expander', { 'list-item__expander--expanded': isExpanded })}
        data-color-mode='light'
      >
        <div className={cl('list-item__expander-content', { 'list-item__expander-content--expanded': isExpanded })}>
          <div className='list-item__expand-content'>
            <div className='list-item__email-tags'>
              <a className='list-item__email' href={`mailto:${props.project.email}`}>
                {props.project.email}
              </a>
              <div className='list-item__tags'>
                {props.project.tags
                  .filter(tag => !['AI', 'SE', 'CS', 'CPS'].includes(tag))
                  .map(tag => (
                    <Tag key={tag} tag={tag} />
                  ))}
              </div>
            </div>

            <MDEditor.Markdown
              source={props.project.description}
              previewOptions={{
                rehypePlugins: [[rehypeSanitize]],
              }}
            />

            <div className='list-item__buttons'>
              {props.project.buttons.map(({ label, colour, onClick }) => (
                <button key={label} className={`list-item__button list-item__button--${colour}`} onClick={onClick}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

export default ProjectListItem
