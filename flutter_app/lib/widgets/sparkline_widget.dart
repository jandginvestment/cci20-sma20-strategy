import 'package:flutter/material.dart';
import '../models/scan_result.dart';

class SparklineWidget extends StatelessWidget {
  final SparklineData data;
  final double width;
  final double height;

  const SparklineWidget({
    super.key,
    required this.data,
    this.width = 54.0,
    this.height = 22.0,
  });

  @override
  Widget build(BuildContext context) {
    if (data.points.isEmpty) {
      return SizedBox(width: width, height: height);
    }
    return SizedBox(
      width: width,
      height: height,
      child: CustomPaint(
        painter: _SparklinePainter(data: data),
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  final SparklineData data;

  _SparklinePainter({required this.data});

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw zero line (dashed line at data.zeroY)
    final zeroPaint = Paint()
      ..color = Colors.white.withOpacity(0.12)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final zeroY = data.zeroY * size.height;
    final double dashWidth = 2.0;
    final double dashSpace = 2.0;
    double startX = 0.0;

    while (startX < size.width) {
      canvas.drawLine(
        Offset(startX, zeroY),
        Offset(startX + dashWidth, zeroY),
        zeroPaint,
      );
      startX += dashWidth + dashSpace;
    }

    // 2. Draw sparkline path
    final pathPaint = Paint()
      ..color = const Color(0xFF818CF8) // indigo accent
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path();
    for (int i = 0; i < data.points.length; i++) {
      final pt = data.points[i];
      final x = pt.dx * size.width;
      final y = pt.dy * size.height;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    canvas.drawPath(path, pathPaint);
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) {
    return oldDelegate.data != data;
  }
}
