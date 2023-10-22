import React from 'react'

import Navbar from '../components/navbar/navbar'
import api from "../api"

class Page extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      bannerMessage: null,
    }
  }

  async componentDidMount() {
    if (api.getApiTokenData().type === 's') {
      this.setState({
        bannerMessage: (await api.user.student.getCV(api.getApiTokenData().uid, true).exec()) !== 'present' && (
          <p>Please (re)upload your CV <b>as soon as possible</b></p>
        )
      })
    }
  }

  render() {
    return (
      <div className='d-md-flex'>
        <Navbar />
        <div className='page-content'>
          {this.state.bannerMessage &&
            <div className='popup-banner'>
              {this.state.bannerMessage}
            </div>
          }

          {this.props.page}
        </div>
      </div>
    )
  }
}

export default Page
