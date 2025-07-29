import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        {user ? (
          <div className="space-y-2">
            <div><strong>Name:</strong> {user.name}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Role:</strong> {user.role || "User"}</div>
          </div>
        ) : (
          <p className="text-muted-foreground">No user data</p>
        )}
      </div>
    </div>
  );
};

export default Profile; 