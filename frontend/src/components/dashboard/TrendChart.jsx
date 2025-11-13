import { useMemo } from 'react'
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const TrendChart = ({ points = [], className = '', height = 260 }) => {
  const chartData = useMemo(() => {
    const labels = points.map((point) => new Date(point.period).toLocaleDateString())
    return {
      labels,
      datasets: [
        {
          label: 'Sales',
          data: points.map((point) => point.sales),
          borderColor: '#3b0270',
          backgroundColor: 'rgba(59, 2, 112, 0.1)',
          tension: 0.35,
          fill: true
        },
        {
          label: 'Expenses',
          data: points.map((point) => point.expenses),
          borderColor: '#ff4e00',
          backgroundColor: 'rgba(255, 78, 0, 0.1)',
          tension: 0.35,
          fill: true
        }
      ]
    }
  }, [points])

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: true,
          text: 'Sales vs Expenses (last 7 days)',
          font: {
            family: 'Satoshi'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }),
    []
  )

  return (
    <div className={`rounded-2xl bg-white p-6 shadow-sm ${className}`}>
      <div style={{ height }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}

export default TrendChart
