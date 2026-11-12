import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Vibrant Sunset Palette
  static const Color primaryColor = Color(0xFF4D3A4D);
  static const Color secondaryColor = Color(0xFFBE5CA9);
  static const Color tertiaryColor = Color(0xFFD59CC5);
  static const Color background = Color(0xFFEADADA);
  
  static const Color textPrimary = Color(0xFF4D3A4D); // Using primary for strong text
  static const Color textSecondary = Color(0xFF7A6B7A); // Muted primary for secondary text
  static const Color cardColor = Color(0xFFFFFFFF); // White cards for contrast against EADADA background
  
  // Status Colors (adjusted to fit the theme)
  static const Color normalStatus = Color(0xFF4CAF50);
  static const Color warningStatus = Color(0xFFFF9800);
  static const Color highStatus = Color(0xFFE53935);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: primaryColor,
      scaffoldBackgroundColor: background,
      cardColor: cardColor,
      colorScheme: const ColorScheme.light(
        primary: primaryColor,
        secondary: secondaryColor,
        tertiary: tertiaryColor,
        surface: cardColor,
        background: background,
        error: highStatus,
      ),
      textTheme: GoogleFonts.interTextTheme().copyWith(
        displayLarge: GoogleFonts.inter(color: textPrimary, fontWeight: FontWeight.bold),
        displayMedium: GoogleFonts.inter(color: textPrimary, fontWeight: FontWeight.bold),
        titleLarge: GoogleFonts.inter(color: textPrimary, fontWeight: FontWeight.bold),
        titleMedium: GoogleFonts.inter(color: textPrimary, fontWeight: FontWeight.bold),
        bodyLarge: GoogleFonts.inter(color: textPrimary),
        bodyMedium: GoogleFonts.inter(color: textSecondary),
        bodySmall: GoogleFonts.inter(color: textSecondary),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
      ),
    );
  }
}

