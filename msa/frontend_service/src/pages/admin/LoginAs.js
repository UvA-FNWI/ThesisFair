import React from 'react'
import { Container, Form } from 'react-bootstrap'

import api from '../../api'

class LoginAs extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      users: [],
    }
  }

  async componentDidMount() {
    const users = await api.user.getAll().exec()

    users.sort((a, b) => {
      a = a.firstname + a.lastname
      b = b.firstname + b.lastname

      if (a < b) return -1
      if (a > b) return 1
      return 0
    })

    this.setState({ users })
  }

  loginAs = uid => {
    const user = this.state.users.find(user => user.uid === uid)
    if (!user) {
      return
    }

    const newToken = {
      uid: uid,
    }

    if (user.studentnumber) {
      newToken.type = 's'
    } else {
      newToken.type = 'r'

      if ('enid' in user) newToken.enid = user.enid
      if ('enid' in user) newToken.enids = [user.enid]
      if ('enids' in user) newToken.enids = user.enids
      newToken.repAdmin = user.repAdmin
    }

    api.overrideApiTokenData(newToken)
  }

  render() {
    return (
      <Container className='mt-2'>
        <div className='mb-4'>
          <h1>Login as a student or representative</h1>
        </div>

        <div className='mb-4'>
          <Form.Select onChange={e => this.loginAs(e.target.value)}>
            <option>Select a student</option>
            {this.state.users
              .filter(user => !!user.studentnumber)
              .map(({ firstname, lastname, studentnumber, uid }) => (
                <option key={uid} value={uid}>
                  {firstname || lastname ? `${firstname} ${lastname}` : studentnumber}
                </option>
              ))}
          </Form.Select>
        </div>

        <div className='mb-4'>
          <Form.Select onChange={e => this.loginAs(e.target.value)}>
            <option>Login as representative</option>
            <option>Login as representative</option>
            {this.state.users
              .filter(user => user.enids?.length > 0)
              .map(({ firstname, lastname, uid }) => (
                <option key={uid} value={uid}>
                  {firstname} {lastname}
                </option>
              ))}
          </Form.Select>
        </div>
      </Container>
    )
  }
}

export default LoginAs
