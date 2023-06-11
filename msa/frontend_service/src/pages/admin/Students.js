import React from 'react'
import { Container, Table, Button } from 'react-bootstrap'
import downloadIcon from 'bootstrap-icons/icons/download.svg'
import api, { downloadCV } from '../../api'

class TableRow extends React.Component {
  constructor(props) {
    super(props)

    this.state = {}
  }

  render() {
    return (
      <tr>
        <td>{this.props.user.studentnumber}</td>
        <td>
          {this.props.user.firstname} {this.props.user.lastname}
        </td>
        <td>{this.props.user.email}</td>
        <td style={{ width: '1px', whiteSpace: 'nowrap' }}>
          <Button
            size='sm'
            variant='outline-primary'
            onClick={e => {
              e.stopPropagation()
              downloadCV(this.props.user.uid, `${this.props.user.firstname} ${this.props.user.lastname}`)
            }}
          >
            <img src={downloadIcon} alt='download' />
          </Button>
        </td>
      </tr>
    )
  }
}

class Students extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      users: [],
    }
  }

  async componentDidMount() {
    const users = await api.user.getAll('student').exec()
    this.setState({ users })
  }

  render() {
    return (
      <Container className='mt-2'>
        <div className='mb-4'>
          <h1>Students</h1>
        </div>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>StudentID</th>
              <th>Full name</th>
              <th>Email</th>
              <th>CV</th>
            </tr>
          </thead>
          <tbody>
            {this.state.users.map(user => (
              <TableRow key={user.uid} user={user} />
            ))}
          </tbody>
        </Table>
      </Container>
    )
  }
}

export default Students
