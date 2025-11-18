import * as React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { EventData } from '../data/types';
import { useEventContext } from '../context/EventContext';

interface Props {
  data?: EventData | any;
  imageData?: any;
}

const SharedEventHeader: React.FC<Props> = ({ data, imageData }) => {
  const [open, setOpen] = React.useState(false);
  const { eventData, imageAnalysisData } = useEventContext();

  // Context 우선: prop이 전달되지 않으면 전역 상태 사용
  const dataToUse = data ?? eventData ?? {};
  const imageDataToUse = imageData ?? imageAnalysisData;

  // 더미 이벤트 목록 (필요 시 상위에서 전달하도록 확장 가능)
  const events = ['행사 1', '행사 2', '행사 3'];

  const pad = (num: number): string => (num < 10 ? `0${num}` : `${num}`);

  const formatAddress = (address: string | undefined): string => {
    if (!address) return '정보 없음';
    const parts = address.split('/');
    const placeName = parts[0] ? parts[0].trim() : '장소 미상';
    const roadAddress = parts[1] ? parts[1].trim() : '주소 미상';
    return `${placeName} (${roadAddress})`;
  };

  const formatDate = (dateRange: string | undefined): string => {
    if (!dateRange || !dateRange.includes('~')) return '정보 없음';
    const [startDateTimeStr] = dateRange.split('~').map((s: string) => s.trim());
    const startDate = new Date(startDateTimeStr.replace(/\./g, '-').replace(/\//g, '-'));
    if (isNaN(startDate.getTime())) return '정보 없음';
    const startDay = ['일', '월', '화', '수', '목', '금', '토'][startDate.getDay()];
    return `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())} ${pad(startDate.getHours())}:${pad(startDate.getMinutes())}(${startDay})`;
  };

  const calculateDDay = (dateStr: string | undefined, type: '예약' | '행사') => {
    if (!dateStr || dateStr.length < 10 || dateStr === 'YYYY-MM-DD HH:MM') {
      return { dday: 'D-?', date: type === '예약' ? '예약일 미정' : '행사일 미정' };
    }
    const targetDate = new Date(dateStr.substring(0, 10).replace(/\./g, '-'));
    if (isNaN(targetDate.getTime())) {
      return { dday: 'D-?', date: type === '예약' ? '예약일 미정' : '행사일 미정' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const dateFormatted = dateStr.substring(0, 10).replace(/-/g, '.');
    let dday: string;
    if (diffDays === 0) dday = 'D-DAY';
    else if (diffDays > 0) dday = `D-${diffDays}`;
    else dday = '종료';
    return { dday, date: dateFormatted };
  };

  const getLocalImage = (name: string) => {
    switch (name) {
      case 'ganadi.png':
        return require('../../assets/images/ganadi.png');
      case 'black.png':
        return require('../../assets/images/black.png');
      case 'logoWhite.png':
        return require('../../assets/images/logoWhite.png');
      case 'arrowdown.png':
        return require('../../assets/images/arrowdown.png');
      default:
        return require('../../assets/images/goods1.png');
    }
  };

  const reservationInfo = dataToUse?.reservation_info;
  const isNoReservationRequired =
    !reservationInfo ||
    ((!reservationInfo.open_date || reservationInfo.open_date.trim() === 'YYYY-MM-DD HH:MM') &&
      (!reservationInfo.method || reservationInfo.method.trim() === '정보 없음' || reservationInfo.method.trim() === '') &&
      (!reservationInfo.notes || reservationInfo.notes.trim() === '정보 없음' || reservationInfo.notes.trim() === ''));

  const { dday: reservationDDay, date: reservationDate } = calculateDDay(dataToUse?.reservation_info?.open_date, '예약');
  const eventStartDateStr = dataToUse?.event_overview?.date_range?.split('~')[0]?.trim();
  const { dday: eventDDay, date: eventDate } = calculateDDay(eventStartDateStr, '행사');

  return (
    <View style={headerStyles.imageBackgroundContainer}>
      <Image source={getLocalImage('ganadi.png')} style={headerStyles.eventImage} resizeMode="cover" />
      <Image source={getLocalImage('black.png')} style={headerStyles.eventImageCover} resizeMode="cover" />
      <Image source={getLocalImage('logoWhite.png')} style={headerStyles.logo} resizeMode="contain" />

      <View style={headerStyles.dropdownWrapper}>
        <TouchableOpacity style={headerStyles.dropdown} onPress={() => setOpen(!open)} activeOpacity={0.8}>
          <Text style={headerStyles.dropdownText}>{dataToUse?.event_title || '행사 정보 없음'}</Text>
          <Image
            source={getLocalImage('arrowdown.png')}
            style={[headerStyles.iconArrowBottom242, open && { transform: [{ rotate: '180deg' }] }]}
          />
        </TouchableOpacity>
        {open && (
          <View style={headerStyles.dropdownList}>
            {events.filter((e) => e !== dataToUse?.event_title).map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={headerStyles.dropdownItem}
                onPress={() => {
                  setOpen(false);
                  Alert.alert('선택', `${item} 선택`);
                }}
                activeOpacity={0.7}
              >
                <Text style={headerStyles.dropdownItemText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={headerStyles.overlayContent}>
        <Text style={headerStyles.mainTitle}>{dataToUse?.event_title || '행사명 미정'}</Text>
        <Text style={headerStyles.ddayText}>
          {isNoReservationRequired ? (
            <>
              <Text style={headerStyles.preRegistration}>행사 시작</Text>
              <Text style={headerStyles.ddayValue}> {eventDDay} ({eventDate})</Text>
            </>
          ) : (
            <>
              <Text style={headerStyles.preRegistration}>예약 마감</Text>
              <Text style={headerStyles.ddayValue}> {reservationDDay} ({reservationDate})</Text>
            </>
          )}
        </Text>
        <View style={headerStyles.ul}>
          <Text style={headerStyles.li}>주소: {formatAddress(dataToUse?.event_overview?.address)}</Text>
          <Text style={headerStyles.li}>
            일시: {formatDate(dataToUse?.event_overview?.date_range)}
            {dataToUse?.event_overview?.duration_days ? ` (${dataToUse.event_overview.duration_days}일간)` : ''}
          </Text>
          <Text style={headerStyles.li}>운영시간: {dataToUse?.event_overview?.daily_hours || '정보 없음'}</Text>
        </View>
      </View>
    </View>
  );
};

export const headerStyles = StyleSheet.create({
  imageBackgroundContainer: {
    height: 480,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  eventImage: {
    width: 219,
    height: 274,
    position: 'absolute',
    top: 162,
    left: '50%',
    marginLeft: -109,
  },
  eventImageCover: {
    width: 360,
    height: 480,
    position: 'absolute',
  },
  logo: {
    width: 123,
    height: 22,
    marginBottom: 28,
    marginTop: 56,
    marginLeft: 16,
    zIndex: 10,
  },
  dropdownWrapper: {
    position: 'absolute',
    top: 100,
    left: 16,
    width: 328,
    zIndex: 10,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 239, 239, 0.50)',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownText: {
    fontSize: 12,
    color: '#616161',
    fontWeight: '600',
  },
  dropdownList: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
    overflow: 'hidden',
    zIndex: 20,
  },
  dropdownItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 14, color: '#444' },
  iconArrowBottom242: { width: 20, height: 20, tintColor: '#616161' },
  overlayContent: { position: 'absolute', top: 150, left: 16, right: 16, zIndex: 2 },
  mainTitle: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 8, marginTop: 119 },
  ddayText: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 24 },
  preRegistration: { color: '#fff', fontSize: 14 },
  ddayValue: { color: '#FF59AD', fontSize: 20, fontWeight: '700' },
  ul: { marginVertical: 8, paddingLeft: 0 },
  li: { marginBottom: 4, fontSize: 12, color: '#fff', lineHeight: 20 },
});

export default SharedEventHeader;
