class User {
  const User({required this.id, required this.name, required this.email});

  final int id;
  final String name;
  final String email;

  User copyWith({String? name, String? email}) {
    return User(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
    );
  }
}
