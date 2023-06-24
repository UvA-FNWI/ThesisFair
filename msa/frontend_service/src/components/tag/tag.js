import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import chevronDownIcon from 'bootstrap-icons/icons/chevron-down.svg'
import closeIcon from 'bootstrap-icons/icons/x-lg.svg'
import gripIcon from 'bootstrap-icons/icons/grip-vertical.svg'

import cl from 'clsx'

import './tag.scss'

function Tag(props) {
  const [selected, setSelected] = React.useState(props.selected || false)

  return (
    <div className={cl(`tag tag--${props.tag}`, { 'tag--selected': props.selectable && selected })}>
      <p>{props.tag}</p>
      {props.selectable && (
        <img
          className='tag__icon'
          src={selected ? closeIcon : gripIcon}
          alt='close icon'
          onClick={() => setSelected(!selected)}
        />
      )}
    </div>
  )
}

export default Tag
