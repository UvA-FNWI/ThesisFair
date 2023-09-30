import React, { useEffect, useRef, useState } from 'react'
import { ViewportList } from 'react-viewport-list'

import './voteListItem.scss'
import './voteList.scss'

function VoteList(props) {
  const listRef = useRef(null)

  return (
    <div className='entity-list--red-border' style={props.style}>
      <div className='entity-list' style={{ maxHeight: props.maxHeight }} ref={listRef}>
        <ViewportList viewportRef={listRef} items={props.items} itemMinSize={48}>
          {item => <VoteListItem key={`${item.uid}-${item.pid}`} {...item} />}
        </ViewportList>
      </div>
    </div>
  )
}

function VoteListItem(props) {
  switch (props?.type) {
      case 'heading':
        return (
          <div>
            <br />
            <span className='d-flex justify-content-between'>
              <h3 style={{ alignSelf: 'flex-end' }}>{props.text}</h3>
            </span>
            <hr style={{ marginTop: 0, marginBottom: '1.25em' }} />
          </div>
        )
      case 'item':
      default:
        return (
          <li className='entity-list-item'>
            <div className='entity-list-item__header'>
              <div className='entity-list-item__title'>
                <p>{props.firstname} {props.lastname}</p>
              </div>

              {props.headerButtons && <div className='entity-list-item__buttons'>{props.headerButtons()}</div>}
            </div>
          </li>
        )
    }
}

// Export EntityList and EntityListItem as EntityList.Item
VoteList.Item = VoteListItem

export default VoteList
