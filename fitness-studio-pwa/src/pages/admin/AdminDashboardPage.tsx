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
import CardMembershipIcon from '@mui/icons-material/CardMembership'
import EditNoteIcon from '@mui/icons-material/EditNote'

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
      title: 'Управление абонементами',
      description: 'Абонементы пользователей, оплата, продление',
      icon: <CardMembershipIcon sx={{ fontSize: 40 }} />,
      path: '/admin/subscriptions',
    },
    {
      title: 'Типы абонементов',
      description: 'Создание и редактирование тарифов',
      icon: <EditNoteIcon sx={{ fontSize: 40 }} />,
      path: '/admin/subscription-plans',
    },
  ]

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Grid container direction="column" spacing={2} sx={{ mt: 2 }}>
        {menuItems.map((item) => (
          <Grid item xs={12} key={item.path}>
            <Card>
              <CardActionArea onClick={() => navigate(item.path)}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                  {item.icon}
                  <div>
                    <Typography variant="h6">
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </div>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}
