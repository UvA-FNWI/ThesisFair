import fuzzysort from 'fuzzysort'
import React from 'react'
import { Container, Form } from 'react-bootstrap'
import { useParams } from 'react-router-dom'

import * as session from '../../session'
import api from '../../api'
import VoteList from '../../components/voteList/voteList'

import '../../styles/events.scss'

class Students extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      projectsByPid: {},
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
    let projects
    let votes
    let students
    // let additionalStudents

    try {
      projects = await api.project.getOfEntity(null, session.getEnid()).exec()
      votes = await api.votes.getOfProjects(projects.map(project => project.pid)).exec()
      students = await api.user.getMultiple(votes.map(({uid}) => uid)).exec()
      // additionalStudents = await api.user.student.getWhoManuallyShared().exec()
    } catch (error) {
      console.error(error)
      this.setState({ error: true })
    }

    //projects.push({pid: "manuallyShared", name: "Additional students"})

    // for (const student of additionalStudents || []) {
    //   if (!votes.map(vote => vote.uid).includes(student.uid))
    //     students.push(student)
    // }
    //
    // for (const student of students) {
    //   if (!student) {
    //     continue
    //   }
    //
    //   student.pids = votes.find(vote => vote.uid == student.uid)?.pids || []
    //   if (additionalStudents.map(student => student.uid).includes(student.uid)) {
    //     student.pids.push("manuallyShared")
    //   }
    // }

    const projectsByPid = Object.fromEntries(projects.map(project => [project.pid, project]))
    this.setState({ students, projectsByPid })

    this.filter(this.state.filters, students)
  }

  getNoResultText() {
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
        <h1 className='events-page__header'>
          {this.state.students.map(student => student.pids).flat().length} votes cast by {this.state.students.length} students
        </h1>

        <Form className='search-bar'>
          <Form.Group className='mb-3' controlId='searchBar'>
            <Form.Control type='text' placeholder='Search names and email addresses' onInput={e => this.search(e.target.value)} />
          </Form.Group>
        </Form>

      {this.state.filteredStudents?.length > 0
        ? <VoteList
            style={{ height: '1px', flexGrow: '1' }}
            items={Array.from(this.categorizeByProjects(this.state.filteredStudents)).map(
              ([pid, students]) => {
                return [
                // {type: 'heading', text: `${this.state.projectsByPid[pid].name} (showing ${students.length} / ${this.state.students.filter(vote => vote.pids.includes(pid)).length} votes)`, pid},
                {type: 'heading', text: `${this.state.projectsByPid[pid].name} (${this.state.students.filter(vote => vote.pids.includes(pid)).length} students)`, pid},
                ...students.map(student => ({...student, pid: pid})),
              ]}
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
