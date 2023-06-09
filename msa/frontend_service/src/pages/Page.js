import React from 'react'

import Navbar from '../components/navbar/navbar'

class Page extends React.Component {
  render() {
    return (
      <div className='d-md-flex'>
        <Navbar />
        <div className='page-content'>{this.props.page}</div>
      </div>
    )
  }
}

export default Page
