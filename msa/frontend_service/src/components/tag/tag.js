import React from 'react'

import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import closeIcon from 'bootstrap-icons/icons/x-lg.svg'
import minusIcon from 'bootstrap-icons/icons/dash-lg.svg'

import cl from 'clsx'

import './tag.scss'

const getTag = (label, selectable, selected, disabled, onClick, id) => (
  <div
    className={cl(`tag tag--${label.replaceAll(' ', '')}`, {
      'tag--selectable': selectable,
      'tag--selected': selectable && selected,
      'tag--disabled': disabled,
    })}
    onClick={() => {
      onClick(id)
    }}
  >
    <p>{label}</p>
    <img
      className={cl('tag__icon', { 'tag__icon--rotated': !selected, 'tag__icon--visible': selectable })}
      src={disabled ? minusIcon : closeIcon}
      alt={selected ? 'remove icon' : 'add icon'}
    />
  </div>
)

const Tag = props =>
  props.tooltip ? (
    <OverlayTrigger overlay={<Tooltip>{props.tooltip}</Tooltip>}>
      {getTag(props.label || '', props.selectable, props.selected, props.disabled, props.onClick, props.id)}
    </OverlayTrigger>
  ) : (
    getTag(props.label || '', props.selectable, props.selected, props.disabled, props.onClick, props.id)
  )

export default Tag
