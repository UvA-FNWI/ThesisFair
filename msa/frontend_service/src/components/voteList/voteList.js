import React, { useRef } from 'react'
import { downloadCV } from '../../api'
import { ViewportList } from 'react-viewport-list'
import { Button } from 'react-bootstrap'
import { degreeById } from '../../utilities/degreeDefinitions'
import Tag from '../tag/tag'

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
              <div className='entity-list-item__title' style={{marginRight: '2em'}}>
                <p>{props.firstname} {props.lastname}
                  {props.email && <>
                      {' ('}
                      <a href={`mailto:${props.email}`}>{props.email}</a>
                      {')'}
                    </>
                  }
                  {' '}
                </p>
              </div>

              {
                props.studies.filter((e, i) => props.studies.indexOf(e) == i).map(tagId => {
                  const tag = degreeById[tagId]

                  return tag && <Tag key={tag.id} label={tag.tag} tooltip={tag.tooltip} selectable={false} />
                })
              }

              {
                props.websites.map(website => {
                  try {
                    return <a style={{marginLeft: '1em'}} href={website}>{(new URL(website)).hostname.replace('www.', '').replace('.com', '')}</a>
                  } catch {
                    return
                  }
                })
              }

              <div className='entity-list-item__buttons'>
                <Button onClick={() => downloadCV(props.uid, `${props.firstname} ${props.lastname}`)}>Download CV</Button>
              </div>
            </div>
          </li>
        )
    }
}

// Export EntityList and EntityListItem as EntityList.Item
VoteList.Item = VoteListItem

export default VoteList
