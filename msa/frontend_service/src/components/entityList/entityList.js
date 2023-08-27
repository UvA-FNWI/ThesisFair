import React, { useEffect, useRef, useState } from 'react'
import { ViewportList } from 'react-viewport-list'

import './entityListItem.scss'
import './entityList.scss'

function EntityList(props) {
  const listRef = useRef(null)

  return (
    <div className='entity-list--red-border'>
      <div className='entity-list' style={{ maxHeight: props.maxHeight }} ref={listRef}>
        <ViewportList viewportRef={listRef} items={props.items} itemMinSize={48}>
          {item => <EntityListItem key={item.enid} {...item} />}
        </ViewportList>
      </div>
    </div>
  )
}

function EntityListItem(props) {
  let badgeExecutionCount = 0

  const [paymentTags, setPaymentTags] = useState([])

  useEffect(() => {
    const updateTags = async () => {
      if (badgeExecutionCount >= 1) return
      badgeExecutionCount++

      const tags = await props.getTags()

      setPaymentTags(tags || [])
    }

    updateTags()
  }, [badgeExecutionCount, props])

  return (
    <li className='entity-list-item'>
      <div className='entity-list-item__header'>
        <div className='entity-list-item__title'>
          <p>{props.name}</p>
        </div>

        <div className='entity-list-item__badge'>{paymentTags.map(props.createTag)}</div>

        <div className='entity-list-item__buttons'>{props.headerButtons()}</div>
      </div>
    </li>
  )
}

// Export EntityList and EntityListItem as EntityList.Item
EntityList.Item = EntityListItem

export default EntityList
