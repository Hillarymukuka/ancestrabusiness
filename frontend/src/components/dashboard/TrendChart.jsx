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
          position: 'bottom',
          labels: {
            padding: 10,
            font: {
              size: window.innerWidth < 640 ? 11 : 12,
              family: 'Satoshi'
            }
          }
        },
        title: {
          display: true,
          text: window.innerWidth < 640 ? 'Sales vs Expenses' : 'Sales vs Expenses (last 7 days)',
          font: {
            family: 'Satoshi',
            size: window.innerWidth < 640 ? 13 : 14
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: window.innerWidth < 640 ? 10 : 11
            }
          }
        },
        x: {
          ticks: {
            font: {
              size: window.innerWidth < 640 ? 10 : 11
            },
            maxRotation: window.innerWidth < 640 ? 45 : 0,
            minRotation: window.innerWidth < 640 ? 45 : 0
          }
        }
      }
    }),
    []
  )

  return (
    <div className={`rounded-xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-sm ${className}`}>
      <div style={{ height: window.innerWidth < 640 ? 240 : height }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}

export default TrendChart
