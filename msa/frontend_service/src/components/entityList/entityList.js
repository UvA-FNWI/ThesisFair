import React, { useRef, useEffect, useState } from 'react'

import { ViewportList } from 'react-viewport-list'

import './entityListItem.scss'
import './entityList.scss'

function EntityList(props) {
  const listRef = useRef(null)

  return (
    <div className='list--red-border'>
      <div className='list' style={{ maxHeight: props.maxHeight }} ref={listRef}>
        <ViewportList viewportRef={listRef} items={props.items} itemMinSize={48}>
          {item => <EntityListItem {...item} />}
        </ViewportList>
      </div>
    </div>
  )
}

function EntityListItem(props) {
  const [badge, setBadge] = useState()

  useEffect(() => {
    const updateTags = async () => {
      const getTags = await props.getTags()

      setBadge(getTags)
    }

    updateTags()
  }, [props])

  return (
    <li className='list-item'>
      <div className='list-item__header'>
        <div className='list-item__title'>
          <p>{props.name}</p>
        </div>

        {badge && typeof badge === 'function' && <div className='list-item__badge'>{badge()}</div>}
        <div className='list-item__buttons'>{props.headerButtons()}</div>
      </div>
    </li>
  )
}

// Export EntityList and EntityListItem as EntityList.Item
EntityList.Item = EntityListItem

export default EntityList
