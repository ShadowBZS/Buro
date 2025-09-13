import React from 'react';
import { useHistory } from 'react-router-dom';
import { Card, CardBody, CardHeader, Input, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useAuth } from '../../contexts/auth-context';

export const AdminLogin: React.FC = () => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const { login } = useAuth();
  const history = useHistory();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        history.push('/admin');
      } else {
        setError('Неверное имя пользователя или пароль');
      }
    } catch (err) {
      setError('Произошла ошибка при входе');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center gap-2 pb-0">
          <Icon icon="lucide:key" className="text-primary text-4xl" />
          <h1 className="text-xl font-semibold">Система управления ключами</h1>
          <p className="text-default-500 text-center">
            Вход для администратора
          </p>
          <p className="text-small text-default-400">
            Логин: admin / Пароль: admin
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Имя пользователя"
              value={username}
              onValueChange={setUsername}
              variant="bordered"
              isRequired
              autoComplete="username"
            />
            <Input
              label="Пароль"
              type="password"
              value={password}
              onValueChange={setPassword}
              variant="bordered"
              isRequired
              autoComplete="current-password"
            />
            {error && (
              <div className="text-danger text-small">{error}</div>
            )}
            <div className="flex flex-col gap-2">
              <Button 
                type="submit" 
                color="primary" 
                isLoading={isLoading}
                className="w-full"
              >
                Войти
              </Button>
              <div className="flex justify-between mt-4">
                <Button 
                  as="a" 
                  href="/operator/building1" 
                  variant="light" 
                  color="default"
                >
                  Оператор корпуса 1
                </Button>
                <Button 
                  as="a" 
                  href="/operator/building2" 
                  variant="light" 
                  color="default"
                >
                  Оператор корпуса 2
                </Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
