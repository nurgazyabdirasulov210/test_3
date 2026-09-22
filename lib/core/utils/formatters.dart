import 'package:intl/intl.dart';

class AppFormatters {
  AppFormatters(this.currencySymbol);

  final String currencySymbol;

  final DateFormat _dateFormat = DateFormat('dd.MM.yyyy');
  final NumberFormat _amountFormat = NumberFormat.decimalPattern('ru');

  String amount(double value) => '${_amountFormat.format(value)} $currencySymbol';

  String date(DateTime value) => _dateFormat.format(value);
}
