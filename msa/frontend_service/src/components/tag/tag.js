import React from 'react'
import MDEditor from '@uiw/react-md-editor'
import rehypeSanitize from 'rehype-sanitize'

import closeIcon from 'bootstrap-icons/icons/x-lg.svg'
import minusIcon from 'bootstrap-icons/icons/dash-lg.svg'

import cl from 'clsx'

import './tag.scss'

function Tag(props) {
  return (
    <div
      className={cl(`tag tag--${props.label}`, {
        'tag--hoverable': props.selectable,
        'tag--selected': props.selectable && props.selected,
        'tag--disabled': props.disabled,
      })}
      onClick={() => {
        props.onClick(props.id)
      }}
    >
      <p>{props.label}</p>
      <img
        className={cl('tag__icon', { 'tag__icon--rotated': !props.selected })}
        src={props.disabled ? minusIcon : closeIcon}
        alt={props.selected ? 'remove icon' : 'add icon'}
      />
    </div>
  )
}

export default Tag
