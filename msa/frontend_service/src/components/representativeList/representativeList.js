import React from 'react'
import { Button, Modal, Card } from 'react-bootstrap'
import makeAdminIcon from 'bootstrap-icons/icons/star.svg'
import isAdminIcon from 'bootstrap-icons/icons/star-fill.svg'
import deleteIcon from 'bootstrap-icons/icons/x-lg.svg'
import api from '../../api'
import CreateUserPopup from '../createUserPopup/createUserPopup'

class RepresentativeList extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      users: [],
      newUserPopup: false,
    }
  }

  async componentDidMount() {
    const users = await api.user.getOfEntity(this.props.enid).exec()
    this.setState({ users: users })
  }

  toggleAdmin = async userIndex => {
    const user = this.state.users[userIndex]

    await api.user.representative
      .update({
        uid: user.uid,
        repAdmin: !user.repAdmin,
      })
      .exec()

    const newUsers = [...this.state.users]
    newUsers[userIndex].repAdmin = !user.repAdmin
    this.setState({ users: newUsers })
  }

  createUser = async user => {
    let newUser
    try {
      newUser = await api.user.representative
        .create({
          enid: this.props.enid,
          ...user,
        })
        .exec()
    } catch (error) {
      if (error.errors) {
        return error.errors[0].message
      }

      throw error
    }

    const newUsers = [...this.state.users]
    newUsers.push(newUser)
    this.setState({ users: newUsers })
    return null
  }

  deleteUser = async userIndex => {
    const user = this.state.users[userIndex]

    if (!window.confirm(`Are you sure you want to delete user "${user.firstname} ${user.lastname}"?`)) {
      return
    }

    await api.user.delete(user.uid).exec()

    const newUsers = [...this.state.users]
    newUsers.splice(userIndex, 1)
    this.setState({ users: newUsers })
  }

  render() {
    return (
      <>
        {this.state.newUserPopup ? (
          <CreateUserPopup close={() => this.setState({ newUserPopup: false })} create={this.createUser} />
        ) : null}
        <div>
          <div>
            {this.state.users.map((user, userIndex) => (
              <Card key={userIndex} className='mb-2'>
                <Card.Body className='d-flex justify-content-between align-items-center'>
                  <p className='m-0'>
                    {user.firstname} {user.lastname} - {user.email}
                  </p>
                  <div>
                    <img
                      src={user.repAdmin ? isAdminIcon : makeAdminIcon}
                      alt='Toggle admin state'
                      style={{ cursor: 'pointer' }}
                      className='me-2'
                      onClick={() => this.toggleAdmin(userIndex)}
                    />
                    <img
                      src={deleteIcon}
                      alt='Delete user'
                      style={{ cursor: 'pointer' }}
                      onClick={() => this.deleteUser(userIndex)}
                    />
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>

          <Button onClick={() => this.setState({ newUserPopup: true })}>Create new account</Button>
        </div>
      </>
    )
  }
}

export default RepresentativeList
