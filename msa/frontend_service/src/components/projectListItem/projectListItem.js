import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import chevronDownIcon from 'bootstrap-icons/icons/chevron-down.svg'
import closeIcon from 'bootstrap-icons/icons/x-lg.svg'
import gripIcon from 'bootstrap-icons/icons/grip-vertical.svg'

import './projectListItem.scss'

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

        {/* TODO: Show only MSc tags when expanded */}
        {props.project.tags && !props.selected && (
          <div className='list-item__tags'>
            {props.project.tags.map(({ fullTag, abbreviation }) => (
              <div className='list-item__tag' key={fullTag}>
                <p>{abbreviation.toString()}</p>
              </div>
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
      {isExpanded && (
        <div className='list-item__expanded' data-color-mode='light'>
          <p className='list-item__email'>{props.project.email}</p>

          <MDEditor.Markdown
            source={props.project.description}
            previewOptions={{
              rehypePlugins: [[rehypeSanitize]],
            }}
          />

          {!props.selected && !props.hidden ? (
            <div className='list-item__buttons'>
              <button className='list-item__button list-item__button--hide' onClick={hideProject}>
                Hide
              </button>

              <button className='list-item__button list-item__button--add' onClick={addProject}>
                Add
              </button>
            </div>
          ) : (
            <div className='list-item__buttons'>
              <button className='list-item__button list-item__button--unhide' onClick={unhideProject}>
                Unhide
              </button>

              <button className='list-item__button list-item__button--add' onClick={removeProject}>
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export default ProjectListItem
