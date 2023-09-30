import React, { useRef } from 'react'
import api, { downloadCV } from '../../api'
import { ViewportList } from 'react-viewport-list'
import { Button } from 'react-bootstrap'

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
              {props.email &&
                <div>
                  <a href={`mailto:${props.email}`}>{props.email}</a>
                </div>
              }

              <div>
                <p>{props.studies.join(", ")}</p>
              </div>

              <div className='entity-list-item__buttons'>
                <Button onClick={() => downloadCV(props.uid)}>Download CV</Button>
              </div>
            </div>
          </li>
        )
    }
}

// Export EntityList and EntityListItem as EntityList.Item
VoteList.Item = VoteListItem

export default VoteList
