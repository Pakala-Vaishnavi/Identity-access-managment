import datetime
import os
import time
import PySimpleGUI as sg
import cv2
import pandas as pd
import numpy as np
from scipy.spatial import distance as dist

def eye_aspect_ratio(eye):
    """
    Calculate the eye aspect ratio (EAR) to detect blinks
    """
    # Compute the euclidean distances between the vertical eye landmarks
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    
    # Compute the euclidean distance between the horizontal eye landmarks
    C = dist.euclidean(eye[0], eye[3])
    
    # Compute the eye aspect ratio
    ear = (A + B) / (2.0 * C)
    return ear

def detect_blink_opencv(face_roi, eye_cascade):
    """
    Detect eye blinks using OpenCV Haar cascades and contour analysis
    """
    gray_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
    
    # Detect eyes using Haar cascade
    eyes = eye_cascade.detectMultiScale(gray_face, scaleFactor=1.1, minNeighbors=5, minSize=(20, 20))
    
    if len(eyes) >= 2:  # At least 2 eyes detected
        blink_count = 0
        for (ex, ey, ew, eh) in eyes:
            # Extract eye region
            eye_roi = gray_face[ey:ey+eh, ex:ex+ew]
            
            # Apply threshold to create binary image
            _, thresh = cv2.threshold(eye_roi, 45, 255, cv2.THRESH_BINARY_INV)
            
            # Find contours in the eye region
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if contours:
                # Find the largest contour (should be the eye)
                largest_contour = max(contours, key=cv2.contourArea)
                area = cv2.contourArea(largest_contour)
                
                # If contour area is small, eye might be closed (blinking)
                if area < 100:  # Threshold for closed eye
                    blink_count += 1
        
        # If both eyes show signs of being closed, it's likely a blink
        return blink_count >= 2
    
    return False

def detect_blink_contour(face_roi):
    """
    Alternative blink detection using contour analysis of eye regions
    """
    gray_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
    
    # Define approximate eye regions (relative to face)
    height, width = gray_face.shape
    
    # Left eye region (approximately)
    left_eye_roi = gray_face[int(height*0.2):int(height*0.5), int(width*0.1):int(width*0.45)]
    # Right eye region (approximately)
    right_eye_roi = gray_face[int(height*0.2):int(height*0.5), int(width*0.55):int(width*0.9)]
    
    def analyze_eye_region(eye_roi):
        if eye_roi.size == 0:
            return False
        
        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(eye_roi, (5, 5), 0)
        
        # Apply adaptive threshold
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Find the largest contour
            largest_contour = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(largest_contour)
            
            # Calculate aspect ratio of the contour
            x, y, w, h = cv2.boundingRect(largest_contour)
            aspect_ratio = float(w) / h if h > 0 else 0
            
            # Eye is likely closed if area is small or aspect ratio is unusual
            return area < 50 or aspect_ratio < 0.5
        
        return False
    
    # Check both eyes
    left_eye_closed = analyze_eye_region(left_eye_roi)
    right_eye_closed = analyze_eye_region(right_eye_roi)
    
    # Return True if both eyes appear to be closed (blinking)
    return left_eye_closed and right_eye_closed

def detect_liveness_blink(face_roi, prev_frames, frame_count):
    """
    Advanced liveness detection using temporal analysis and micro-movements
    """
    gray_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
    
    # Store current frame for temporal analysis
    if len(prev_frames) >= 10:
        prev_frames.pop(0)
    prev_frames.append(gray_face.copy())
    
    if len(prev_frames) < 5:  # Need at least 5 frames for analysis
        return False, "Insufficient frames"
    
    # Method 1: Frame difference analysis (detects movement) - improved for real faces
    frame_diff = cv2.absdiff(prev_frames[-1], prev_frames[-3])  # Compare with closer frame
    movement_score = np.mean(frame_diff)
    
    # Also check for any movement in recent frames
    if len(prev_frames) >= 5:
        recent_movement = np.mean([np.mean(cv2.absdiff(prev_frames[i], prev_frames[i-1])) for i in range(-4, 0)])
        movement_score = max(movement_score, recent_movement)
    
    # Method 2: Laplacian variance (detects texture changes)
    laplacian_var = cv2.Laplacian(gray_face, cv2.CV_64F).var()
    
    # Method 3: Eye region temporal analysis
    height, width = gray_face.shape
    left_eye_roi = gray_face[int(height*0.2):int(height*0.5), int(width*0.1):int(width*0.45)]
    right_eye_roi = gray_face[int(height*0.2):int(height*0.5), int(width*0.55):int(width*0.9)]
    
    # Calculate eye region variance over time
    if len(prev_frames) >= 3:
        left_eye_prev = prev_frames[-3][int(height*0.2):int(height*0.5), int(width*0.1):int(width*0.45)]
        right_eye_prev = prev_frames[-3][int(height*0.2):int(height*0.5), int(width*0.55):int(width*0.9)]
        
        left_eye_diff = cv2.absdiff(left_eye_roi, left_eye_prev)
        right_eye_diff = cv2.absdiff(right_eye_roi, right_eye_prev)
        
        left_eye_movement = np.mean(left_eye_diff)
        right_eye_movement = np.mean(right_eye_diff)
    else:
        left_eye_movement = 0
        right_eye_movement = 0
    
    # Simplified liveness detection - more reliable for real faces
    
    # Primary check: Detect static photos (very low movement + high texture)
    is_static_photo = movement_score < 0.05 and laplacian_var > 150
    
    # Secondary check: Ensure some basic movement exists
    has_some_movement = movement_score > 0.1
    
    # Final decision: Live if not static photo and has some movement
    is_live = not is_static_photo and has_some_movement
    
    # Additional safety: If texture is very low, might be poor lighting but still real
    if not is_live and laplacian_var < 10:
        is_live = True  # Poor lighting but likely real face
    
    # Blink detection with liveness verification
    if is_live:
        # Use contour analysis for blink detection
        left_eye_closed = analyze_eye_region_for_liveness(left_eye_roi)
        right_eye_closed = analyze_eye_region_for_liveness(right_eye_roi)
        
        if left_eye_closed and right_eye_closed:
            if debug_mode:
                return True, f"Live blink (M:{movement_score:.1f}, T:{laplacian_var:.0f})"
            else:
                return True, f"Live blink detected (movement: {movement_score:.1f})"
        else:
            if debug_mode:
                return False, f"Eyes open (M:{movement_score:.1f}, T:{laplacian_var:.0f})"
            else:
                return False, f"Eyes open (live) (movement: {movement_score:.1f})"
    else:
        if debug_mode:
            return False, f"Static (M:{movement_score:.1f}, T:{laplacian_var:.0f})"
        else:
            return False, f"Static image detected (movement: {movement_score:.1f})"

def analyze_eye_region_for_liveness(eye_roi):
    """
    Enhanced eye region analysis for liveness detection
    """
    if eye_roi.size == 0:
        return False
    
    # Apply multiple filters for better detection
    blurred = cv2.GaussianBlur(eye_roi, (5, 5), 0)
    
    # Use multiple thresholding methods
    _, thresh1 = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    thresh2 = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    
    # Combine both thresholding results
    combined_thresh = cv2.bitwise_and(thresh1, thresh2)
    
    # Find contours
    contours, _ = cv2.findContours(combined_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if contours:
        # Find the largest contour
        largest_contour = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest_contour)
        
        # Calculate aspect ratio of the contour
        x, y, w, h = cv2.boundingRect(largest_contour)
        aspect_ratio = float(w) / h if h > 0 else 0
        
        # More strict criteria for liveness detection
        return area < 30 or aspect_ratio < 0.3
    
    return False

def detect_blink(shape, detector):
    """
    Detect if eyes are blinking using facial landmarks
    """
    # Define constants for blink detection
    EYE_AR_THRESH = 0.21
    EYE_AR_CONSEC_FRAMES = 2
    
    # Get the facial landmarks
    gray = cv2.cvtColor(shape, cv2.COLOR_BGR2GRAY)
    rects = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    
    for (x, y, w, h) in rects:
        # Get facial landmarks
        shape = detector.predict(gray[y:y+h, x:x+w])
        
        # Extract the left and right eye coordinates
        leftEye = shape[42:48]
        rightEye = shape[36:42]
        
        # Calculate the eye aspect ratio for both eyes
        leftEAR = eye_aspect_ratio(leftEye)
        rightEAR = eye_aspect_ratio(rightEye)
        
        # Average the eye aspect ratio together for both eyes
        ear = (leftEAR + rightEAR) / 2.0
        
        return ear < EYE_AR_THRESH
    
    return False

def recognize_attendence():
    # Professional dark theme with modern colors
    sg.theme('DarkBlue3')
    
    # Professional color palette
    PRIMARY_COLOR = '#1E88E5'      # Professional blue
    SUCCESS_COLOR = '#43A047'      # Professional green
    WARNING_COLOR = '#FF8F00'      # Professional orange
    DANGER_COLOR = '#E53935'       # Professional red
    ACCENT_COLOR = '#FFC107'       # Gold accent
    BG_DARK = '#1A1A1A'           # Dark background
    BG_CARD = '#2D2D2D'           # Card background
    TEXT_PRIMARY = '#FFFFFF'      # Primary text
    TEXT_SECONDARY = '#B0B0B0'    # Secondary text
    BORDER_COLOR = '#404040'      # Border color
    
    # Professional header with gradient effect
    header = [
        [sg.Column([
            [sg.Image(filename='Images/Facial_Recognition_logo.png', size=(20, 20), pad=((30, 20), (25, 15))),
             sg.Column([
                 [sg.Text('SMART ACCESS', font=('Segoe UI', 28, 'bold'), text_color=ACCENT_COLOR, pad=((0, 0), (5, 0)))],
                 [sg.Text('Face Recognition System', font=('Segoe UI', 16), text_color=TEXT_SECONDARY, pad=((0, 0), (0, 5)))]
             ], pad=((0, 0), (0, 0))),
             sg.VerticalSeparator(pad=((30, 30), (20, 20))),
             sg.Column([
                 [sg.Text('LIVE', font=('Segoe UI', 12, 'bold'), text_color=SUCCESS_COLOR)],
                 [sg.Text('●', font=('Segoe UI', 16), text_color=SUCCESS_COLOR, background_color=BG_DARK)]
             ], justification='center', pad=((0, 30), (0, 0)))]
        ], background_color=BG_DARK, pad=((0, 0), (0, 0)))]
    ]
    
    # Main content with professional card layout
    main_content = [
        [
            # Left panel - Video feed with professional styling
            sg.Column([
                [sg.Frame('', [
                    [sg.Text('📹 LIVE CAMERA FEED', font=('Segoe UI', 16, 'bold'), text_color=ACCENT_COLOR, justification='center', pad=((0, 0), (15, 10)))],
                    [sg.Image(filename='', key='image', size=(720, 540), pad=((20, 20), (10, 20)), background_color=BG_CARD)],
                    [sg.HorizontalSeparator(pad=((20, 20), (10, 10)))],
                    [sg.Column([
                        [sg.Text('🔍 FACE DETECTION', font=('Segoe UI', 12, 'bold'), text_color=TEXT_PRIMARY)],
                        [sg.Text('No face detected', key='face_status', font=('Segoe UI', 11), text_color=WARNING_COLOR, background_color=BG_CARD, pad=((0, 0), (5, 0)))]
                    ], pad=((20, 10), (0, 0))),
                     sg.Column([
                        [sg.Text('🎯 CONFIDENCE', font=('Segoe UI', 12, 'bold'), text_color=TEXT_PRIMARY)],
                        [sg.Text('0%', key='confidence', font=('Segoe UI', 11), text_color=TEXT_SECONDARY, background_color=BG_CARD, pad=((0, 0), (5, 0)))]
                    ], pad=((10, 10), (0, 0))),
                     sg.Column([
                        [sg.Text('👁️ BLINK STATUS', font=('Segoe UI', 12, 'bold'), text_color=TEXT_PRIMARY)],
                        [sg.Text('No blink detected', key='blink_status', font=('Segoe UI', 11), text_color=WARNING_COLOR, background_color=BG_CARD, pad=((0, 0), (5, 0)))]
                    ], pad=((10, 20), (0, 0)))]
                ], font=('Segoe UI', 12, 'bold'), relief=sg.RELIEF_FLAT, background_color=BG_CARD, border_width=2, pad=((20, 10), (20, 20)))]
            ], background_color=BG_DARK, pad=((20, 10), (10, 20))),
            
            # Right panel - Professional control center
            sg.Column([
                [sg.Frame('', [
                    [sg.Text('⚙️ CONTROL CENTER', font=('Segoe UI', 18, 'bold'), text_color=ACCENT_COLOR, justification='center', pad=((0, 0), (15, 20)))],
                    
                    # Time and Date Card
                    [sg.Frame('🕒 CURRENT TIME', [
                        [sg.Text(f'📅 {datetime.datetime.fromtimestamp(time.time()).strftime("%Y-%m-%d")}', key='_date_', font=('Segoe UI', 14, 'bold'), text_color=TEXT_PRIMARY, pad=((15, 15), (10, 5)))],
                        [sg.Text(f'⏰ {datetime.datetime.fromtimestamp(time.time()).strftime("%H:%M:%S")}', key='_time_', font=('Segoe UI', 14, 'bold'), text_color=ACCENT_COLOR, pad=((15, 15), (5, 10)))]
                    ], font=('Segoe UI', 12, 'bold'), relief=sg.RELIEF_FLAT, background_color=BG_DARK, border_width=1, pad=((0, 0), (0, 20)))],
                    
                    # Person Info Card
                    [sg.Frame('👤 RECOGNIZED PERSON', [
                        [sg.Text('Name: ', key='person_name', font=('Segoe UI', 12), text_color=TEXT_SECONDARY, pad=((15, 15), (10, 5)))],
                        [sg.Text('ID: ', key='person_id', font=('Segoe UI', 12), text_color=TEXT_SECONDARY, pad=((15, 15), (5, 10)))]
                    ], font=('Segoe UI', 12, 'bold'), relief=sg.RELIEF_FLAT, background_color=BG_DARK, border_width=1, pad=((0, 0), (0, 20)))],
                    
                    # Action Buttons with professional styling
                    [sg.Button("🕐 CLOCK IN", size=(25, 2), font=('Segoe UI', 13, 'bold'), 
                              button_color=(TEXT_PRIMARY, SUCCESS_COLOR), key='Clock IN', 
                              pad=((0, 0), (10, 8)), border_width=0, mouseover_colors=(SUCCESS_COLOR, TEXT_PRIMARY))],
                    [sg.Button("🕐 CLOCK OUT", size=(25, 2), font=('Segoe UI', 13, 'bold'), 
                              button_color=(TEXT_PRIMARY, WARNING_COLOR), key='Clock OUT',
                              pad=((0, 0), (8, 8)), border_width=0, mouseover_colors=(WARNING_COLOR, TEXT_PRIMARY))],
                    [sg.Button("💾 SAVE ATTENDANCE", size=(25, 2), font=('Segoe UI', 13, 'bold'), 
                              button_color=(TEXT_PRIMARY, PRIMARY_COLOR), key='Save Attendance',
                              pad=((0, 0), (8, 8)), border_width=0, mouseover_colors=(PRIMARY_COLOR, TEXT_PRIMARY))],
                    [sg.Button("❌ BACK", size=(25, 2), font=('Segoe UI', 13, 'bold'), 
                              button_color=(TEXT_PRIMARY, DANGER_COLOR), key='Back',
                              pad=((0, 0), (8, 20)), border_width=0, mouseover_colors=(DANGER_COLOR, TEXT_PRIMARY))],
                    
                    # Statistics Card
                    [sg.Frame('📊 SESSION STATISTICS', [
                        [sg.Text('🟢 Total Clock-ins: ', key='total_clockins', font=('Segoe UI', 11), text_color=TEXT_SECONDARY, pad=((15, 15), (10, 5)))],
                        [sg.Text('🟠 Total Clock-outs: ', key='total_clockouts', font=('Segoe UI', 11), text_color=TEXT_SECONDARY, pad=((15, 15), (5, 5)))],
                        [sg.Text('✅ Present Today: ', key='present_today', font=('Segoe UI', 11), text_color=TEXT_SECONDARY, pad=((15, 15), (5, 10)))]
                    ], font=('Segoe UI', 12, 'bold'), relief=sg.RELIEF_FLAT, background_color=BG_DARK, border_width=1, pad=((0, 0), (0, 10)))]
                    
                ], font=('Segoe UI', 12, 'bold'), relief=sg.RELIEF_FLAT, background_color=BG_CARD, border_width=2, pad=((10, 20), (20, 20)))]
            ], background_color=BG_DARK, pad=((10, 20), (10, 20)))
        ]
    ]
    
    # Combine header and main content
    layout = header + main_content
    
    # Create window with professional styling
    window = sg.Window('Smart Attendance - Face Recognition System', 
                      layout, 
                      auto_size_buttons=False, 
                      element_justification='c', 
                      location=(50, 30),
                      size=(1400, 800),
                      resizable=True,
                      finalize=True,
                      background_color=BG_DARK,
                      icon='Images/Facial_Recognition_logo.png')
    
    # Initialize statistics
    total_clockins = 0
    total_clockouts = 0
    present_today = 0
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.read("TrainingImageLabel"+os.sep+"Trainner.yml")
    faceCascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    # Initialize OpenCV-based blink detection
    blink_detection_available = True
    detector = None
    predictor = None
    
    # Load eye cascade classifier for OpenCV blink detection
    try:
        eye_cascade_path = cv2.data.haarcascades + 'haarcascade_eye.xml'
        if os.path.exists(eye_cascade_path):
            eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
            print("OpenCV eye cascade loaded successfully!")
        else:
            # Try alternative path
            eye_cascade_path = "haarcascade_eye.xml"
            if os.path.exists(eye_cascade_path):
                eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
                print("Alternative eye cascade loaded successfully!")
            else:
                print("Eye cascade not found. Using contour-based blink detection.")
                eye_cascade = None
    except Exception as e:
        print(f"Error loading eye cascade: {e}")
        eye_cascade = None
    
    # Also try to initialize dlib as backup (optional)
    dlib_available = False
    try:
        import dlib
        predictor_path = "shape_predictor_68_face_landmarks.dat"
        if os.path.exists(predictor_path):
            detector = dlib.get_frontal_face_detector()
            predictor = dlib.shape_predictor(predictor_path)
            dlib_available = True
            print("dlib facial landmarks available as backup!")
    except ImportError:
        print("dlib not available. Using OpenCV-based blink detection.")
    except Exception as e:
        print(f"dlib initialization error: {e}")
    
    print("Blink detection system initialized!")
    
    df = pd.read_csv("StudentDetails"+os.sep+"StudentDetails.csv")
    font = cv2.FONT_HERSHEY_SIMPLEX
    col_names = ['Id', 'Name', 'Date', 'Clock IN Time', 'Clock OUT Time', 'Duration', 'Status']
    attendance = pd.DataFrame(columns=col_names)
    
    # Initialize and start realtime video capture
    cam = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    cam.set(3, 720)  # set video width
    cam.set(4, 540)  # set video height
    # Define min window size to be recognized as a face
    minW = 0.1 * cam.get(3)
    minH = 0.1 * cam.get(4)
    
    # Blink detection variables
    blink_counter = 0
    blink_detected = False
    consecutive_blinks = 0
    EYE_AR_THRESH = 0.21
    EYE_AR_CONSEC_FRAMES = 2
    
    # Liveness detection variables
    prev_frames = []  # Store previous frames for temporal analysis
    frame_count = 0
    liveness_detected = False
    debug_mode = False  # Set to True to see detailed detection info

    lecture = sg.popup_get_text('Please Enter Lecture Duration', 'HH:MM:SS')

    while True:
        event, values = window.read(timeout=1)
        
        # Update time displays
        current_time = datetime.datetime.fromtimestamp(time.time())
        window.find_element('_date_').update(f'Date: {current_time.strftime("%Y-%m-%d")}')
        window.find_element('_time_').update(f'Time: {current_time.strftime("%H:%M:%S")}')
        
        # Update statistics
        window.find_element('total_clockins').update(f'Total Clock-ins: {total_clockins}')
        window.find_element('total_clockouts').update(f'Total Clock-outs: {total_clockouts}')
        window.find_element('present_today').update(f'Present Today: {present_today}')
        if event == 'Back':
            c = sg.PopupYesNo(f'Save Attendance ?')
            if c == 'No':
                cam.release()
                cv2.destroyAllWindows()
                window.close()
            elif c == 'Yes':
                ts = time.time()
                date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
                timeStamp = datetime.datetime.fromtimestamp(ts).strftime('%H:%M:%S')
                Hour, Minute, Second = timeStamp.split(":")
                fileName = "Attendance"+os.sep+"Attendance_"+date+"_"+Hour+"-"+Minute+"-"+Second+".csv"
                attendance.to_csv(fileName, index=False)
                cam.release()
                cv2.destroyAllWindows()
                window.close()
                sg.popup_timed('Attendance Successful')
            break
        elif event == "Save Attendance" or event == sg.WIN_CLOSED:
            ts = time.time()
            date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
            timeStamp = datetime.datetime.fromtimestamp(ts).strftime('%H:%M:%S')
            Hour, Minute, Second = timeStamp.split(":")
            fileName = "Attendance"+os.sep+"Attendance_"+date+"_"+Hour+"-"+Minute+"-"+Second+".csv"
            attendance.to_csv(fileName, index=False)
            cam.release()
            cv2.destroyAllWindows()
            window.close()
            sg.popup_timed('Attendance Successful')
            break
        elif event == 'Clock IN':
            # Check if a face is detected and recognized
            if 'aa' in locals() and len(aa) > 0:
                # Basic verification - just check if face is detected
                sg.popup_timed('✅ Face detected and recognized!', title='Verification Successful')
                
                check = sg.PopupYesNo(f'{aa[0]} are you clocking In?')
                if check == 'Yes':
                    ts = time.time()
                    date = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
                    timeStamp = datetime.datetime.fromtimestamp(ts).strftime('%H:%M:%S')
                    aa_clean = str(aa)[2:-2]
                    attendance.loc[len(attendance)] = [Id, aa_clean, date, timeStamp, '-', '-', '-']
                    total_clockins += 1
                    sg.popup_timed(f'Clocked IN successfully for {aa_clean}')
                elif check == 'No':
                    print('Not clocked IN')
            else:
                sg.popup_timed('No face detected or recognized. Please position your face properly.')
        elif event == 'Clock OUT':
            # Check if a face is detected and recognized
            if 'aa' in locals() and len(aa) > 0:
                # Basic verification - just check if face is detected
                sg.popup_timed('✅ Face detected and recognized!', title='Verification Successful')
                
                check = sg.PopupYesNo(f'{aa[0]} are you clocking OUT?')
                if check == 'Yes':
                    ts = time.time()
                    timeStamp = datetime.datetime.fromtimestamp(ts).strftime('%H:%M:%S')
                    
                    # Find the attendance record for this person
                    attendance_indices = attendance[attendance['Id'] == Id].index.values
                    
                    if len(attendance_indices) > 0:
                        # Update clock out time
                        attendance.at[attendance_indices[0], 'Clock OUT Time'] = timeStamp
                        
                        # Calculate duration
                        co = attendance.loc[attendance_indices[0], 'Clock OUT Time']
                        ci = attendance.loc[attendance_indices[0], 'Clock IN Time']
                        
                        if co != '-' and ci != '-':
                            FMT = '%H:%M:%S'
                            try:
                                duration = datetime.datetime.strptime(str(co), FMT) - datetime.datetime.strptime(str(ci), FMT)
                                attendance.at[attendance_indices[0], 'Duration'] = str(duration)
                                
                                # Calculate status based on lecture duration
                                if lecture:
                                    try:
                                        lecture_duration = datetime.datetime.strptime(lecture, FMT)
                                        duration_dt = datetime.datetime.strptime(str(duration), '%H:%M:%S')
                                        diff_minutes = abs((lecture_duration - duration_dt).total_seconds() / 60)
                                        
                                        if diff_minutes <= 5:
                                            attendance.at[attendance_indices[0], 'Status'] = 'Present'
                                            present_today += 1
                                        else:
                                            attendance.at[attendance_indices[0], 'Status'] = 'MCR'
                                    except:
                                        attendance.at[attendance_indices[0], 'Status'] = 'Present'
                                        present_today += 1
                                else:
                                    attendance.at[attendance_indices[0], 'Status'] = 'Present'
                                    present_today += 1
                                    
                                total_clockouts += 1
                                sg.popup_timed(f'Clocked OUT successfully for {aa[0]}')
                            except Exception as e:
                                print(f"Error calculating duration: {e}")
                                sg.popup_timed('Error calculating duration')
                    else:
                        sg.popup_timed('No clock-in record found for this person')
                elif check == 'No':
                    print('Not clocked OUT')
            else:
                sg.popup_timed('No face detected or recognized. Please position your face properly.')

        ret, im = cam.read()
        gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
        faces = faceCascade.detectMultiScale(gray, 1.2, 5,minSize = (int(minW), int(minH)),flags = cv2.CASCADE_SCALE_IMAGE)
        
        # Update face detection status with professional styling
        if len(faces) > 0:
            window.find_element('face_status').update('✅ Face detected', text_color=SUCCESS_COLOR, background_color=BG_CARD)
        else:
            window.find_element('face_status').update('❌ No face detected', text_color=WARNING_COLOR, background_color=BG_CARD)
            # Clear person info when no face is detected
            window.find_element('person_name').update('Name: ')
            window.find_element('person_id').update('ID: ')
            window.find_element('confidence').update('0%')
            window.find_element('blink_status').update('No blink detected', text_color=WARNING_COLOR, background_color=BG_CARD)
        
        # Blink detection for each detected face
        blink_detected_current = False
        for(x, y, w, h) in faces:
            cv2.rectangle(im, (x, y), (x+w, y+h), (10, 159, 255), 2)
            Id, conf = recognizer.predict(gray[y:y+h, x:x+w])
            confidence_percent = round(100 - conf)
            
            # Blink detection using multiple methods
            blink_detected_current = False
            
            # Method 1: Try dlib facial landmarks (if available)
            if dlib_available and detector and predictor:
                try:
                    # Convert ROI to dlib format
                    dlib_rect = dlib.rectangle(int(x), int(y), int(x + w), int(y + h))
                    landmarks = predictor(gray, dlib_rect)
                    
                    # Extract eye coordinates
                    left_eye = np.array([(landmarks.part(36).x, landmarks.part(36).y),
                                       (landmarks.part(37).x, landmarks.part(37).y),
                                       (landmarks.part(38).x, landmarks.part(38).y),
                                       (landmarks.part(39).x, landmarks.part(39).y),
                                       (landmarks.part(40).x, landmarks.part(40).y),
                                       (landmarks.part(41).x, landmarks.part(41).y)])
                    
                    right_eye = np.array([(landmarks.part(42).x, landmarks.part(42).y),
                                        (landmarks.part(43).x, landmarks.part(43).y),
                                        (landmarks.part(44).x, landmarks.part(44).y),
                                        (landmarks.part(45).x, landmarks.part(45).y),
                                        (landmarks.part(46).x, landmarks.part(46).y),
                                        (landmarks.part(47).x, landmarks.part(47).y)])
                    
                    # Calculate eye aspect ratios
                    left_ear = eye_aspect_ratio(left_eye)
                    right_ear = eye_aspect_ratio(right_eye)
                    ear = (left_ear + right_ear) / 2.0
                    
                    # Draw eye landmarks
                    for point in left_eye:
                        cv2.circle(im, tuple(point), 2, (0, 255, 0), -1)
                    for point in right_eye:
                        cv2.circle(im, tuple(point), 2, (0, 255, 0), -1)
                    
                    # Blink detection logic
                    if ear < EYE_AR_THRESH:
                        blink_counter += 1
                        if blink_counter >= EYE_AR_CONSEC_FRAMES:
                            blink_detected = True
                            blink_detected_current = True
                            consecutive_blinks += 1
                    else:
                        blink_counter = 0
                        blink_detected = False
                    
                    # Update blink status in UI
                    if blink_detected_current:
                        window.find_element('blink_status').update(f'✅ Blink detected (dlib) ({consecutive_blinks})', text_color=SUCCESS_COLOR, background_color=BG_CARD)
                    else:
                        window.find_element('blink_status').update('👁️ Eyes open (dlib)', text_color=TEXT_SECONDARY, background_color=BG_CARD)
                        
                except Exception as e:
                    print(f"dlib blink detection error: {e}")
                    # Fall back to OpenCV method
                    pass
            
            # Method 2: OpenCV Haar cascade + contour analysis
            if not blink_detected_current and eye_cascade:
                try:
                    face_roi = im[y:y+h, x:x+w]
                    if detect_blink_opencv(face_roi, eye_cascade):
                        blink_detected = True
                        blink_detected_current = True
                        consecutive_blinks += 1
                        window.find_element('blink_status').update(f'✅ Blink detected (OpenCV) ({consecutive_blinks})', text_color=SUCCESS_COLOR, background_color=BG_CARD)
                    else:
                        if not blink_detected_current:
                            window.find_element('blink_status').update('👁️ Eyes open (OpenCV)', text_color=TEXT_SECONDARY, background_color=BG_CARD)
                except Exception as e:
                    print(f"OpenCV blink detection error: {e}")
            
            # Method 3: Advanced liveness detection with temporal analysis
            if not blink_detected_current:
                try:
                    face_roi = im[y:y+h, x:x+w]
                    frame_count += 1
                    
                    # Use advanced liveness detection
                    blink_result, status_message = detect_liveness_blink(face_roi, prev_frames, frame_count)
                    
                    if blink_result:
                        blink_detected = True
                        blink_detected_current = True
                        consecutive_blinks += 1
                        liveness_detected = True
                        window.find_element('blink_status').update(f'✅ {status_message} ({consecutive_blinks})', text_color=SUCCESS_COLOR, background_color=BG_CARD)
                    else:
                        if not blink_detected_current:
                            if "Static image" in status_message:
                                window.find_element('blink_status').update(f'❌ {status_message}', text_color=DANGER_COLOR, background_color=BG_CARD)
                            else:
                                window.find_element('blink_status').update(f'👁️ {status_message}', text_color=TEXT_SECONDARY, background_color=BG_CARD)
                except Exception as e:
                    print(f"Liveness detection error: {e}")
                    window.find_element('blink_status').update('⚠️ Liveness detection error', text_color=WARNING_COLOR, background_color=BG_CARD)
            
            if conf < 100:
                aa = df.loc[df['Id'] == Id]['Name'].values
                confstr = "  {0}%".format(confidence_percent)
                tt = str(Id)+"-"+aa
                
                # Update UI with recognized person info
                if len(aa) > 0:
                    window.find_element('person_name').update(f'Name: {aa[0]}')
                    window.find_element('person_id').update(f'ID: {Id}')
                    window.find_element('confidence').update(f'{confidence_percent}%')
            else:
                Id = '  Unknown  '
                tt = str(Id)
                confstr = "  {0}%".format(confidence_percent)
                
                # Update UI for unknown person
                window.find_element('person_name').update('Name: Unknown')
                window.find_element('person_id').update('ID: Unknown')
                window.find_element('confidence').update(f'{confidence_percent}%')
                
            tt = str(tt)[2:-2]
            if(100-conf) > 67:
                tt = tt + " [Pass]"
                cv2.putText(im, str(tt), (x+5,y-5), font, 1, (255, 255, 255), 2)
            else:
                cv2.putText(im, str(tt), (x + 5, y - 5), font, 1, (255, 255, 255), 2)
            if (100-conf) > 67:
                cv2.putText(im, str(confstr), (x + 5, y + h - 5), font,1, (0, 255, 0),1 )
            elif (100-conf) > 50:
                cv2.putText(im, str(confstr), (x + 5, y + h - 5), font, 1, (0, 255, 255), 1)
            else:
                cv2.putText(im, str(confstr), (x + 5, y + h - 5), font, 1, (0, 0, 255), 1)
                
        attendance = attendance.drop_duplicates(subset=['Id'], keep='first')
        imgbytes = cv2.imencode(".png", im)[1].tobytes()
        window["image"].update(data=imgbytes)

    cam.release()
    cv2.destroyAllWindows()
    os.system('cls')
