import './styles/app.scss';
import { useEffect, useState, useCallback } from 'react'
import logo from './logo.svg';
import { Loader, Pagination, Icon, Dropdown, Input } from 'semantic-ui-react'
import Moment from 'react-moment';
import NumberInput from 'semantic-ui-react-numberinput';
import { debounce } from 'lodash-es'
import { PieChart } from 'react-minimal-pie-chart';


const reportTypeClassName = {
  primary: 'color-primary',
  intermediate: 'color-intermediate',
  extended: 'color-extended'
}

let lowestScoreReport;
let heighestScoreReport;

function App() {

  const [tableProps, setTableProps] = useState({
    fullDataSet: [],
    filteredDataSet: [],
    paginatedDataSet: [],
    activePage: 0,
    tableRows: 15,
    sort: {
      field: '',
      isNumeric: false,
      direction: 'ASC'
    },
    filter: {
      type: '',
      scoreMin: 0,
      scoreMax: 0,
      bankName: '',
      bankBIC: ''
    }
  })


  /* Fatch data from reports.json and insert it in component state.
     In meantime normalize data to make it easier to manipulate */
  const fatchData = () => {
    fetch('reports.json')
      .then(response => response.json())
      .then(data => {
        const normalizedData = data.map(d => {

          if (d.body.reportScore > heighestScoreReport || !heighestScoreReport) {
            heighestScoreReport = Math.ceil(d.body.reportScore)
          }
          if (d.body.reportScore < lowestScoreReport || !lowestScoreReport) {
            lowestScoreReport = Math.floor(d.body.reportScore)
          }


          return {
            ...d.body,
            createdAt: new Date(d.createdAt).getTime(),
            publishedAt: new Date(d.publishedAt).getTime(),
            uuid: d.uuid,
            bankBIC: d.body.bankBIC[0]
          }
        })

        setTableProps({
          ...tableProps,
          fullDataSet: normalizedData,
          filteredDataSet: normalizedData,
          activePage: 1,
        })
      })
      .catch(err => alert(err))
  }


  // Update paginatedDataSet
  const paginate = () => {
    const firstItemNo = (tableProps.activePage - 1) * tableProps.tableRows
    setTableProps({
      ...tableProps,
      paginatedDataSet: tableProps.filteredDataSet.slice(firstItemNo, firstItemNo + tableProps.tableRows)
    })
  }

  // Determine sort direction, sort and store results
  const setSort = (field, isNumeric) => () => {
    const direction = tableProps.sort.field === field ? tableProps.sort.direction === 'ASC' ? 'DESC' : 'ASC' : 'ASC'
    const result = sort(field, isNumeric, direction)
    setSortResults(result, { field, isNumeric, direction })
  }

  // Do the actual sorting and return sorted filteredDataSet
  const sort = (field, isNumeric, direction, dataSet = tableProps.filteredDataSet) => {

    const sortedDataSet = dataSet.sort((a, b) => {
      let A = a[field]
      let B = b[field]

      if (!isNumeric) {
        A = A.toUpperCase()
        B = B.toUpperCase()
      }

      if (A < B) { return direction === 'ASC' ? -1 : 1 }
      if (A > B) { return direction === 'ASC' ? 1 : -1 }
      return 0
    })

    return sortedDataSet
  }

  // Save sorted value in component state
  const setSortResults = (dataSet, sort) => setTableProps({ ...tableProps, filteredDataSet: dataSet, sort })


  // Get data from reports.json on application start
  useEffect(fatchData, [])

  // Paginate data set on requred events
  useEffect(paginate, [
    tableProps.activePage,
    tableProps.sort.field,
    tableProps.sort.direction,
    tableProps.filteredDataSet
  ])

  // Create arrow icon pointing to the right direction every time sort field or sort direction changes
  const renderSortArrow = useCallback(
    field => tableProps.sort.field === field &&
      <Icon name={`${tableProps.sort.direction === 'ASC' ? 'angle down' : 'angle up'}`} />,
    [tableProps.sort.field, tableProps.sort.direction]
  )

  const renderTableHeader = (text, field, alignSide, isNumeric) =>
    <th className={`align-${alignSide}`} onClick={setSort(field, isNumeric)}>
      <span>{text}</span>
      {renderSortArrow(field)}
    </th>


  // Do all the filters user typed, and do sort at the end
  const runFilter = (value, type) => {

    // If score Min or score Max leave boundaries - prevent data insert and calcualation
    if (
      type === 'scoreMin'
      &&
      (value < lowestScoreReport || value > heighestScoreReport - 1 ||
        (tableProps.filter.scoreMax ? tableProps.filter.scoreMax : heighestScoreReport) <= value)
    ) return
    else if (
      type === 'scoreMax'
      &&
      (value < lowestScoreReport || value > heighestScoreReport ||
        (tableProps.filter.scoreMin ? tableProps.filter.scoreMin : lowestScoreReport) >= value)
    ) return

    let filter = { ...tableProps.filter, [type]: value }

    let filteredDataSet = tableProps.fullDataSet

    if (filter.type) {
      filteredDataSet = filteredDataSet.filter(d => d.type === filter.type)
    }
    if (filter.scoreMin) {
      filteredDataSet = filteredDataSet.filter(d => d.reportScore > +filter.scoreMin)
    }
    if (filter.scoreMax) {
      filteredDataSet = filteredDataSet.filter(d => d.reportScore < +filter.scoreMax)
    }
    if (filter.bankName) {
      filteredDataSet = filteredDataSet.filter(d => d.bankName.toLowerCase().includes(filter.bankName.toLowerCase()))
    }
    if (filter.bankBIC) {
      filteredDataSet = filteredDataSet.filter(d => d.bankBIC.toLowerCase().includes(filter.bankBIC.toLowerCase()))
    }

    const { field, isNumeric, direction } = tableProps.sort
    const result = field ? sort(field, isNumeric, direction, filteredDataSet) : filteredDataSet

    setTableProps({
      ...tableProps,
      filteredDataSet: result,
      activePage: 1,
      filter
    })
  }

  const debounceNameSearch = (evt, { value }) => runFilter(value, 'bankName')
  const debounceBICSearch = (evt, { value }) => runFilter(value, 'bankBIC')

  return (
    <>
      <header >
        <img src={logo} className="react-logo" alt="logo" />
        <p>Elucidate React Test App</p>
      </header>
      <main>
        <div id='filter-wrapper'>
          <div className='filter-row'>
            <label><Icon name='filter' />Type</label>
            <div className='input-wrapper'>
              <Dropdown
                placeholder='Select Type'
                clearable
                selection
                options={[
                  {
                    key: 'primary',
                    text: 'primary',
                    value: 'primary'
                  },
                  {
                    key: 'extended',
                    text: 'extended',
                    value: 'extended'
                  },
                  {
                    key: 'intermediate',
                    text: 'intermediate',
                    value: 'intermediate'
                  }
                ]}
                onChange={(evt, option) => runFilter(option.value, 'type')}
              />
            </div>
          </div>
          <div className='filter-row'>
            <label><Icon name='filter' />Min. Score</label>
            <div className='input-wrapper'>
              {
                lowestScoreReport &&
                <NumberInput
                  value={tableProps.filter.scoreMin || lowestScoreReport.toString()}
                  onChange={value => runFilter(value, 'scoreMin')}
                  allowMouseWheel
                  doubleClickStepAmount={5}
                  buttonPlacement={'right'}
                  className="number-input"
                />
              }
            </div>
          </div>
          <div className='filter-row'>
            <label><Icon name='filter' />Max. Score</label>
            <div className='input-wrapper'>
              {
                heighestScoreReport &&
                <NumberInput
                  value={tableProps.filter.scoreMax || heighestScoreReport.toString()}
                  onChange={value => runFilter(value, 'scoreMax')}
                  allowMouseWheel
                  doubleClickStepAmount={5}
                  buttonPlacement={'right'}
                  className="number-input"
                />
              }
            </div>
          </div>
          <div className='filter-row'>
            <label><Icon name='filter' />Bank Name</label>
            <div className='input-wrapper'>
              <Input
                placeholder='Type bank name'
                onChange={debounce(debounceNameSearch, 500)}
              />
            </div>
          </div>
          <div className='filter-row'>
            <label><Icon name='filter' />Bank BIC</label>
            <div className='input-wrapper'>
              <Input
                placeholder='Type bank name'
                onChange={debounce(debounceBICSearch, 500)}
              />
            </div>
          </div>
        </div>
        {
          !tableProps.fullDataSet.length ?
            <Loader active />
            :
            <div className='table-wrapper'>
              <div className='table-total'>Total results: {tableProps.filteredDataSet.length}</div>
              <table>
                <thead>
                  <tr>
                    {renderTableHeader('Bank Name', 'bankName', 'left', false)}
                    {renderTableHeader('Bank BIC', 'bankBIC', 'left', false)}
                    {renderTableHeader('Score Value', 'reportScore', 'right', true)}
                    {renderTableHeader('Type', 'type', 'left', false)}
                    {renderTableHeader('Created', 'createdAt', 'left', true)}
                    {renderTableHeader('Published', 'publishedAt', 'left', true)}
                  </tr>
                </thead>
                <tbody>
                  {
                    tableProps.paginatedDataSet.map(report => {
                      return (
                        <tr key={report.uuid}>
                          <td className='align-left'>{report.bankName}</td>
                          <td className='align-left'>{report.bankBIC}</td>
                          <td className='align-right'>{report.reportScore.toFixed(2)}</td>
                          <td className={`align-left ${reportTypeClassName[report.type]}`}>{report.type}</td>
                          <td className='align-left'><Moment format='DD. MM. YYYY'>{report.createdAt}</Moment></td>
                          <td className='align-left'><Moment format='DD. MM. YYYY'>{report.publishedAt}</Moment></td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
              {
                !tableProps.filteredDataSet.length &&
                <div id='emptyTableNotice'>No Results For This Query</div>
              }
              <Pagination
                activePage={tableProps.activePage}
                totalPages={Math.ceil(tableProps.filteredDataSet.length / tableProps.tableRows)}
                onPageChange={(evt, data) => setTableProps({ ...tableProps, activePage: data.activePage })}
                siblingRange={6}
                boundaryRange={0}
                prevItem={null}
                nextItem={null}
              />
            </div>
        }
        <div className='pie-chart-wrapper'>
          <h6>Records by type (total):</h6>
          <PieChart
            label={({ dataEntry }) => dataEntry.value ? Math.round(dataEntry.value) : ''}
            data={[
              {
                title: 'Primary',
                value: tableProps.filteredDataSet.filter(d => d.type === 'primary').length,
                color: '#7547a7'
              },
              {
                title: 'Extended',
                value: tableProps.filteredDataSet.filter(d => d.type === 'extended').length,
                color: '#af5757'
              },
              {
                title: 'Intermediate',
                value: tableProps.filteredDataSet.filter(d => d.type === 'intermediate').length,
                color: '#4d6d85'
              },
            ]} />
          <div className='legend-wrapper'>
            <div className='primary legend'>Primary</div>
            <div className='extended legend'>Extended</div>
            <div className='intermediate legend'>Intermediate</div>
          </div>
        </div>
      </main>
    </>
  );
}

export default App;
