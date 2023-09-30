import fuzzysort from 'fuzzysort'
import React from 'react'
import { Container, Form } from 'react-bootstrap'
import { useParams } from 'react-router-dom'

import api from '../../api'
import VoteList from '../../components/voteList/voteList'

import '../../styles/events.scss'

class Students extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      students: [], // List of items in the form of {firstname, lastname, ..., pids: [pid, ...]}
      filteredStudents: [],
      error: false,
      filters: {
        search: '',
      },
    }
  }

  searchFilterFunction = (students, filters) => {
    if (!filters.search) return students

    return fuzzysort
      .go(filters.search, this.state.students, { keys: ['firstname', 'lastname', 'email'], limit: 250, threshold: -5000 })
      .map(res => res.obj)
  }

  filterFunctions = [this.searchFilterFunction]

  filter = (filters, allStudents = this.state.students) => {
    const filteredStudents = this.filterFunctions.reduce(
      (students, filterFunction) => filterFunction(students, filters),
      allStudents
    )

    this.setState({ filteredStudents })
  }

  search = searchFilter => {
    if (searchFilter === this.state.filters.search) return

    if (!searchFilter) {
      const filters = { ...this.state.filters, search: '' }

      this.setState({ filters })
      this.filter(filters)
      return
    }

    const filters = { ...this.state.filters, search: searchFilter }

    this.setState({ filters })

    this.filter(filters)
  }

  async componentDidMount() {
    let students
    try {
      students = await api.user.getAll('student').exec()
    } catch (error) {
      console.log(error)
      this.setState({ error: true })
    }

    for (const student of students) {
      student.pids = [Math.floor(Math.random() * 3)]
    }

    this.setState({ students })

    this.filter(this.state.filters, students)
  }

  getNoResultText() {
    console.log(this.state)
    switch (true) {
      // First case assumes there is at least one vote
      case !this.state.error && this.state.students?.length === 0:
        return 'Loading...'
      case !this.state.error && this.state.filteredStudents?.length === 0:
        return 'No votes found with the given filters and/or search term.'
      default:
        return 'Something went wrong while loading the votes.'
    }
  }

  categorizeByProjects = students => {
    const studentsByPid = new Map()

    if (students?.length == 0)
      return studentsByPid

    for (const student of students) {
      for (const pid of student.pids || []) {
        if (studentsByPid.get(pid))
          studentsByPid.get(pid).push(student)
        else
          studentsByPid.set(pid, [student])
      }
    }

    return studentsByPid
  }
  
  render() {
    return (
      <Container className='scrollable-page' style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <h1 className='events-page__header'>Students</h1>

        <Form className='search-bar'>
          <Form.Group className='mb-3' controlId='searchBar'>
            <Form.Control type='text' placeholder='Search names' onInput={e => this.search(e.target.value)} />
          </Form.Group>
        </Form>

      {this.state.filteredStudents?.length > 0
        ? <VoteList
            style={{ height: '1px', flexGrow: '1' }}
            items={Array.from(this.categorizeByProjects(this.state.filteredStudents)).map(
              ([pid, students]) => [
                {type: 'heading', text: pid},
                ...students,
              ]
            ).flat()}
          />
        : <p>{this.getNoResultText()}</p>
      }
      </Container>
    )
  }
}

function StudentsWithParams(props) {
  const params = useParams()

  return <Students {...props} params={params} />
}

export default StudentsWithParams
