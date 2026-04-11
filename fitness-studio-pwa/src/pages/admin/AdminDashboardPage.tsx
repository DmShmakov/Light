import { useNavigate } from 'react-router-dom'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActionArea from '@mui/material/CardActionArea'
import EventIcon from '@mui/icons-material/Event'
import PeopleIcon from '@mui/icons-material/People'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import ListIcon from '@mui/icons-material/List'

export default function AdminDashboardPage() {
  const navigate = useNavigate()

  const menuItems = [
    {
      title: 'Управление расписанием',
      description: 'Просмотр и редактирование занятий',
      icon: <EventIcon sx={{ fontSize: 40 }} />,
      path: '/admin/schedule',
    },
    {
      title: 'Создать занятие',
      description: 'Добавить новое занятие в расписание',
      icon: <AddCircleIcon sx={{ fontSize: 40 }} />,
      path: '/admin/schedule/create',
    },
    {
      title: 'Пользователи',
      description: 'Список всех пользователей',
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      path: '/admin/users',
    },
    {
      title: 'Записи на занятия',
      description: 'Просмотр участников по занятиям',
      icon: <ListIcon sx={{ fontSize: 40 }} />,
      path: '/admin/schedule',
    },
  ]

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Админ-панель
      </Typography>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        {menuItems.map((item) => (
          <Grid item xs={12} sm={6} key={item.path}>
            <Card>
              <CardActionArea onClick={() => navigate(item.path)}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 4 }}>
                  {item.icon}
                  <Typography variant="h6" align="center">
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center">
                    {item.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}
