// models/watchlist.dart
class Watchlist {
  final String name;
  final String file;

  const Watchlist({required this.name, required this.file});

  factory Watchlist.fromJson(Map<String, dynamic> json) {
    return Watchlist(
      name: json['name'] as String,
      file: json['file'] as String,
    );
  }
}
