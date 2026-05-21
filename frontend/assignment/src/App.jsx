import SpinWheelGame from './components/SpinWheelGame';

export default function App() {
  // Mock profiles for clear presentation during verification
  const isTestingAdmin = true; 
  const currentMockUserId = "user-unique-id-12345";

  return (
    <div>
      <h1>Roxstar Arena Panel</h1>
      <SpinWheelGame userId={currentMockUserId} isAdmin={isTestingAdmin} />
    </div>
  );
}