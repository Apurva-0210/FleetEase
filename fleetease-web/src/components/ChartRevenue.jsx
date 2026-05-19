import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function ChartRevenue({ dataPoints=[] }){
  const labels = dataPoints.map(d=>d.day || d.label);
  const data = {
    labels,
    datasets:[{
      label:'Revenue',
      data:dataPoints.map(d=>Number(d.amount||0)),
      borderColor:'#5b2e8c',
      backgroundColor:'rgba(91,46,140,.25)'
    }]
  };
  return <Line data={data} />;
}
