import 'package:flutter/material.dart';
import '../models/signal.dart';

class SignalBadge extends StatelessWidget {
  final Signal signal;

  const SignalBadge({super.key, required this.signal});

  Color _getBgColor() {
    switch (signal.type) {
      case SignalType.reversal:
        return const Color(0x22EF4444); // semi-trans red
      case SignalType.recovery:
        return const Color(0x22FBBF24); // semi-trans amber
      case SignalType.momentum:
        return const Color(0x2210B981); // semi-trans emerald
      case SignalType.overbought:
        return const Color(0x22F97316); // semi-trans orange
      case SignalType.neutral:
        return const Color(0x1194A3B8); // semi-trans slate
    }
  }

  Color _getTextColor() {
    switch (signal.type) {
      case SignalType.reversal:
        return const Color(0xFFF87171); // light red
      case SignalType.recovery:
        return const Color(0xFFFBBF24); // amber
      case SignalType.momentum:
        return const Color(0xFF34D399); // light emerald
      case SignalType.overbought:
        return const Color(0xFFFB923C); // light orange
      case SignalType.neutral:
        return const Color(0xFF94A3B8); // slate
    }
  }

  Color _getBorderColor() {
    switch (signal.type) {
      case SignalType.reversal:
        return const Color(0x44EF4444);
      case SignalType.recovery:
        return const Color(0x44FBBF24);
      case SignalType.momentum:
        return const Color(0x4410B981);
      case SignalType.overbought:
        return const Color(0x44F97316);
      case SignalType.neutral:
        return const Color(0x2294A3B8);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (signal.type == SignalType.neutral) {
      return Text(
        signal.label,
        style: const TextStyle(
          color: Color(0xFF64748B),
          fontSize: 13,
          fontWeight: FontWeight.w500,
        ),
      );
    }

    return Tooltip(
      message: signal.title,
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      textStyle: const TextStyle(color: Colors.white, fontSize: 12),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      margin: const EdgeInsets.symmetric(horizontal: 10),
      waitDuration: const Duration(milliseconds: 100),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: _getBgColor(),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: _getBorderColor(), width: 1),
        ),
        child: Text(
          signal.label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: _getTextColor(),
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.2,
          ),
        ),
      ),
    );
  }
}
