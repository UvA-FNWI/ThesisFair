import React from 'react'

import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import chevronDownIcon from 'bootstrap-icons/icons/chevron-down.svg'
import closeIcon from 'bootstrap-icons/icons/x-lg.svg'
import gripIcon from 'bootstrap-icons/icons/grip-vertical.svg'

import Tag from '../tag/tag'

import { degrees, degreeIds, degreeTagById } from '../../definitions'

import cl from 'clsx'

import './projectListItem.scss'
import './projectList.scss'
// import api from "../../api";

function ProjectList(props) {
  // const params = useParams();
  // const type = api.getApiTokenData().type;

  return (
    <div className='list--red-border'>
      <div className='list' style={{ maxHeight: props.maxHeight }}>
        {props.children}
        {/* Map to project and index */}
        {/* {props.projects.map((project, index) => (
          <ProjectListItem key={index} selected={props.selected} hidden={props.hidden} project={project} />
        ))} */}
      </div>
    </div>
  )
}

function ProjectListItemRep(props) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <li className='list-item'>
      <div className='list-item__header' onClick={toggleExpanded}>
        {props.selected && <img className='list-item__icon list-item__icon--grip' src={gripIcon} alt='grip icon' />}

        <img
          className={`list-item__icon list-item__icon--expand${isExpanded ? ' list-item__icon--rotated' : ''}`}
          src={chevronDownIcon}
          alt='expand icon'
          onClick={toggleExpanded}
        />

        <div className='list-item__title'>
          <p>{props.name}</p>
        </div>

        <div className='list-item__badge'>{props.headerBadge}</div>

        {/* {props.tags && (
          <div className='list-item__tags'>
            {props.tags
              .filter(tag => ['AI', 'SE', 'CS', 'CPS'].includes(tag))
              .map(tag => (
                <Tag key={tag} label={tag} />
              ))}
          </div>
        )} */}

        <div className='list-item__buttons'>{props.headerButtons}</div>

        {props.selected && (
          <img
            className='list-item__icon list-item__icon--close'
            src={closeIcon}
            alt='close icon'
<<<<<<< HEAD
            onClick={removeProject}
=======
            onClick={props.deselectProject}
>>>>>>> b9f5737e3e9bfb2bb14087129272530599c5c57f
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
              <a className='list-item__email' href={`mailto:${props.email}`}>
<<<<<<< HEAD
=======
                {console.log(props.email)}
>>>>>>> b9f5737e3e9bfb2bb14087129272530599c5c57f
                {props.email}
              </a>
              <div className='list-item__tags'>
                {props.tags
<<<<<<< HEAD
                  ?.filter(tag => !['AI', 'SE', 'CS', 'CPS'].includes(tag))
                  .map(tag => (
                    <Tag key={tag} tag={tag} />
=======
                  // ?.filter(tag => !degreeIds.includes(tag))
                  .map(({ tag, tooltip }) => (
                    <Tag key={tag} label={tag} tooltip={tooltip} />
>>>>>>> b9f5737e3e9bfb2bb14087129272530599c5c57f
                  ))}
              </div>
            </div>

<<<<<<< HEAD
            <MDEditor.Markdown
              source={props.description}
=======
            <div className='list-item__divider list-item__divider--less-spacing'>
              <p className='list-item__section-header'>Description</p>
            </div>

            <MDEditor.Markdown
              source={props.description}
              className='list-item__markdown'
>>>>>>> b9f5737e3e9bfb2bb14087129272530599c5c57f
              previewOptions={{
                rehypePlugins: [[rehypeSanitize]],
              }}
            />

<<<<<<< HEAD
=======
            <div className='list-item__divider'>
              <p className='list-item__section-header'>Work Environment</p>
            </div>

            <MDEditor.Markdown
              source={props.environment}
              className='list-item__markdown'
              previewOptions={{
                rehypePlugins: [[rehypeSanitize]],
              }}
            />

            {props.expectations && (
              <>
                <div className='list-item__divider'>
                  <p className='list-item__section-header'>Expectations</p>
                </div>

                <MDEditor.Markdown
                  source={props.expectations}
                  className='list-item__markdown'
                  previewOptions={{
                    rehypePlugins: [[rehypeSanitize]],
                  }}
                />
              </>
            )}

>>>>>>> b9f5737e3e9bfb2bb14087129272530599c5c57f
            <div className='list-item__buttons'>
              {props.buttons?.map(({ label, colour, onClick }) => (
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

// Export ProjectList and ProjectListItem as ProjectList.Item
ProjectList.Item = ProjectListItemRep

export default ProjectList
