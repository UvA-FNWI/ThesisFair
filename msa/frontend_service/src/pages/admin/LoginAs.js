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
      newToken.enid = user.enid
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
              .map(({ uid, firstname, lastname, studentnumber }) => (
                <option value={uid}>{firstname || lastname ? `${firstname} ${lastname}` : studentnumber}</option>
              ))}
          </Form.Select>
        </div>

        <div className='mb-4'>
          <Form.Select onChange={e => this.loginAs(e.target.value)}>
            <option>Login as representative</option>
            {this.state.users
              .filter(user => !!user.enid)
              .map(({ uid, firstname, lastname }) => (
                <option value={uid}>
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
